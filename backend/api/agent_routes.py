"""Agent API routes."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/agent", tags=["agent"])

# These will be set from main.py when agent is available
_engine = None
_agent_func = None
_decision_log: list[dict] = []


def set_engine(e) -> None:
    global _engine
    _engine = e


def set_agent(agent_func) -> None:
    global _agent_func
    _agent_func = agent_func


class QueryRequest(BaseModel):
    message: str


@router.post("/tick")
async def agent_tick():
    """Run one agent decision cycle."""
    if _agent_func is None:
        raise HTTPException(status_code=503, detail="Agent not configured. Set AWS credentials and restart.")
    if _engine is None:
        raise HTTPException(status_code=500, detail="Simulation engine not initialized")

    try:
        prompt = (
            f"Analyze the current greenhouse state and make decisions. "
            f"Current sol: {_engine.state.environment.sol}, "
            f"tick: {_engine.state.environment.tick}. "
            f"Read sensors, check for any issues, and take appropriate actions."
        )
        result = await asyncio.to_thread(_agent_func, prompt)

        decision = {
            "sol": _engine.state.environment.sol,
            "tick": _engine.state.environment.tick,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "response": str(result),
        }
        _decision_log.append(decision)
        _engine.state.agent_decisions.append(decision)

        return decision
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@router.post("/query")
async def agent_query(req: QueryRequest):
    """Natural language query to the agent."""
    if _agent_func is None:
        raise HTTPException(status_code=503, detail="Agent not configured. Set AWS credentials and restart.")

    try:
        result = await asyncio.to_thread(_agent_func, req.message)
        response = {
            "query": req.message,
            "response": str(result),
            "sol": _engine.state.environment.sol if _engine else None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        _decision_log.append(response)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


def clear_decisions() -> None:
    """Clear all decision logs."""
    global _decision_log
    _decision_log = []


@router.get("/decisions")
def get_decisions(limit: int = Query(default=50, ge=1, le=1000)):
    """Decision history log."""
    return {
        "count": len(_decision_log),
        "decisions": _decision_log[-limit:],
    }
