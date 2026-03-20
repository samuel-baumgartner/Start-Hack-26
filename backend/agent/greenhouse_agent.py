"""Strands Agent setup with MCP client, BedrockModel, and AgentCore Memory."""

from __future__ import annotations

import logging
import os
from typing import Callable

from agent.prompts import KB_PROMPT_SECTION, SYSTEM_PROMPT
from agent.tools import (
    adjust_humidity,
    adjust_irrigation,
    adjust_lighting,
    adjust_temperature,
    deploy_microgreens,
    get_greenhouse_status,
    get_nutrition_status,
    harvest_crop,
    plant_crop,
    quarantine_zone,
    read_sensors,
    remove_infected_crops,
    set_zone_priority,
    treat_disease_h2o2,
    treat_disease_uvc,
)

logger = logging.getLogger(__name__)

# All tool functions the agent can use
AGENT_TOOLS = [
    read_sensors,
    get_greenhouse_status,
    adjust_irrigation,
    adjust_temperature,
    adjust_lighting,
    set_zone_priority,
    quarantine_zone,
    harvest_crop,
    plant_crop,
    deploy_microgreens,
    get_nutrition_status,
    treat_disease_uvc,
    treat_disease_h2o2,
    adjust_humidity,
    remove_infected_crops,
]

MCP_ENDPOINT = os.environ.get(
    "MCP_ENDPOINT",
    "https://kb-start-hack-gateway-buyjtibfpg.gateway.bedrock-agentcore.us-east-2.amazonaws.com/mcp",
)


def _dbg(msg: str, data: dict | None = None, hyp: str = "") -> None:
    try:
        import json
        from pathlib import Path
        log_path = Path(__file__).resolve().parent.parent.parent / ".cursor" / "debug.log"
        with open(log_path, "a") as f:
            f.write(json.dumps({"location": "greenhouse_agent.py", "message": msg, "data": data or {}, "hypothesisId": hyp, "timestamp": __import__("time").time() * 1000}) + "\n")
    except Exception:
        pass


def create_agent() -> tuple[Callable | None, object | None]:
    """Create and return a (Strands agent, MCP client) tuple.

    Returns (None, None) if AWS isn't configured.
    MCP client may be None if the connection fails — agent still works with local tools.
    """
    # Check for AWS credentials
    if not os.environ.get("AWS_ACCESS_KEY_ID"):
        _dbg("creds_missing", {"reason": "AWS_ACCESS_KEY_ID not set"}, "H1")
        logger.warning("AWS credentials not set — agent will not be available")
        return None, None

    try:
        from strands import Agent
        from strands.models.bedrock import BedrockModel

        model = BedrockModel(
            model_id="us.anthropic.claude-sonnet-4-5-20250929-v1:0",
            region_name=os.environ.get("AWS_DEFAULT_REGION", "us-west-2"),
            guardrail_id=os.environ.get("GUARDRAIL_ID"),
            guardrail_version=os.environ.get("GUARDRAIL_VERSION", "1"),
            guardrail_trace="enabled",
        )

        # Try to connect to Syngenta MCP Knowledge Base
        mcp_client = _create_mcp_client()

        tools = list(AGENT_TOOLS)
        if mcp_client:
            tools.append(mcp_client)
        _dbg("tools_configured", {"tool_count": len(tools), "has_mcp": mcp_client is not None}, "H2")

        # Add AgentCore Memory tools for persistent episodic memory
        memory_provider = _create_memory_provider()
        if memory_provider:
            tools.extend(memory_provider.tools)

        # Add Bedrock Knowledge Base retrieve tool for RAG
        kb_id = os.environ.get("BEDROCK_KB_ID")
        has_kb = False
        if kb_id:
            try:
                from strands_tools import retrieve
                os.environ["STRANDS_KNOWLEDGE_BASE_ID"] = kb_id
                tools.append(retrieve)
                has_kb = True
                logger.info(f"Bedrock KB retrieve tool added (kb_id={kb_id})")
            except Exception:
                logger.warning("strands_tools.retrieve not available — KB retrieval disabled")

        system_prompt = SYSTEM_PROMPT + (KB_PROMPT_SECTION if has_kb else "")

        agent = Agent(
            model=model,
            system_prompt=system_prompt,
            tools=tools,
        )

        _dbg("agent_created", {"tools_count": len(tools)}, "H2")
        logger.info("Strands agent created successfully")
        return agent, mcp_client

    except ImportError as ie:
        _dbg("agent_import_error", {"error": str(ie)}, "H3")
        logger.warning("strands-agents not installed — trying raw Bedrock fallback")
        return _create_fallback_agent(), None
    except Exception as e:
        _dbg("agent_create_error", {"error": str(e), "type": type(e).__name__}, "H3")
        logger.error(f"Failed to create Strands agent: {e}")
        return _create_fallback_agent(), None


def _create_memory_provider():
    """Create an AgentCore Memory tool provider for persistent agent memory.

    Auto-provisions a new memory resource if MEMORY_ID is not set.
    Returns AgentCoreMemoryToolProvider or None on failure (graceful degradation).
    """
    try:
        import boto3
        from strands_tools.agent_core_memory import AgentCoreMemoryToolProvider

        region = os.environ.get("AWS_DEFAULT_REGION", "us-west-2")
        memory_id = os.environ.get("MEMORY_ID")

        if not memory_id:
            # Auto-provision a new memory resource
            try:
                control_client = boto3.client(
                    "bedrock-agentcore-control",
                    region_name=region,
                )
                response = control_client.create_memory(
                    name="floraGreenhouseMemory",
                    eventExpiryDuration=30,
                )
                memory_id = response["memory"]["id"]
                # Persist for this process lifetime so hot-reloads reuse it
                os.environ["MEMORY_ID"] = memory_id
                logger.warning(
                    f"Auto-provisioned AgentCore Memory: {memory_id}. "
                    f"Set MEMORY_ID={memory_id} to reuse across restarts."
                )
            except Exception as e:
                logger.warning(f"Failed to auto-provision memory: {e} — agent will work without memory")
                return None

        session_id = "flora-primary"
        provider = AgentCoreMemoryToolProvider(
            memory_id=memory_id,
            actor_id="flora-agent",
            session_id=session_id,
            namespace="greenhouse",
            region=region,
        )
        logger.info(f"AgentCore Memory provider created (memory_id={memory_id}, session={session_id})")
        return provider

    except ImportError:
        logger.warning("strands-agents-tools not installed — memory unavailable")
        return None
    except Exception as e:
        logger.warning(f"AgentCore Memory setup failed: {e} — agent will work without memory")
        return None


def _create_mcp_client():
    """Create an MCP client for the Syngenta Knowledge Base. Returns MCPClient or None.

    Note: Do NOT call start() here — the Strands Agent calls load_tools() which
    internally starts the session. Starting it twice raises MCPClientInitializationError.
    """
    try:
        from strands.tools.mcp import MCPClient
        from mcp.client.streamable_http import streamablehttp_client

        mcp_client = MCPClient(
            transport_callable=lambda: streamablehttp_client(url=MCP_ENDPOINT),
            startup_timeout=30,
        )
        logger.info("MCP client created for Syngenta KB (will connect when agent loads tools)")
        return mcp_client
    except Exception as e:
        logger.warning(f"MCP client creation failed: {e} — using local tools only")
        return None


def _create_fallback_agent() -> Callable | None:
    """Fallback: raw Bedrock invoke_model if Strands SDK has issues."""
    try:
        import json
        import boto3

        client = boto3.client(
            "bedrock-runtime",
            region_name=os.environ.get("AWS_DEFAULT_REGION", "us-west-2"),
        )

        def fallback_agent(prompt: str) -> str:
            # Simple single-turn: read status + respond
            status = get_greenhouse_status()
            nutrition = get_nutrition_status()

            full_prompt = (
                f"{SYSTEM_PROMPT}\n\n"
                f"Current status: {json.dumps(status)}\n"
                f"Nutrition: {json.dumps(nutrition)}\n\n"
                f"User request: {prompt}"
            )

            response = client.invoke_model(
                modelId="us.anthropic.claude-sonnet-4-5-20250929-v1:0",
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 2048,
                    "messages": [{"role": "user", "content": full_prompt}],
                }),
            )

            result = json.loads(response["body"].read())
            return result["content"][0]["text"]

        logger.info("Fallback Bedrock agent created")
        return fallback_agent

    except Exception as e:
        logger.error(f"Fallback agent also failed: {e}")
        return None
