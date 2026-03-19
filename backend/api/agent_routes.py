"""Agent API routes."""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel


def _dbg(msg: str, data: dict | None = None, hyp: str = "") -> None:
    try:
        log_path = Path(__file__).resolve().parent.parent.parent / ".cursor" / "debug.log"
        with open(log_path, "a") as f:
            f.write(json.dumps({"location": "agent_routes.py", "message": msg, "data": data or {}, "hypothesisId": hyp, "timestamp": __import__("time").time() * 1000}) + "\n")
    except Exception:
        pass

router = APIRouter(prefix="/agent", tags=["agent"])

# These will be set from main.py when agent is available
_engine = None
_agent_func = None
_decision_log: list[dict] = []
_lock: asyncio.Lock | None = None
_agent_inflight: bool = False
_agent_future = None
_agent_inflight_started_at: float | None = None
STALE_AGENT_SECONDS = 120.0


def _clear_inflight(reason: str) -> None:
    global _agent_inflight, _agent_future, _agent_inflight_started_at
    _agent_inflight = False
    _agent_future = None
    _agent_inflight_started_at = None
    _dbg("agent_inflight_cleared", {"reason": reason}, "H6")


async def _recreate_agent() -> bool:
    """Best-effort recovery: recreate agent instance after stuck invocation."""
    global _agent_func
    if _engine is None:
        _dbg("agent_recreate_skipped", {"reason": "engine_not_set"}, "H8")
        return False
    try:
        from agent.greenhouse_agent import create_agent
        from agent.tools import set_engine as set_tools_engine

        set_tools_engine(_engine)
        new_agent, _mcp_client = await asyncio.to_thread(create_agent)
        if new_agent:
            _agent_func = new_agent
            _dbg("agent_recreated", {"ok": True}, "H8")
            return True
        _dbg("agent_recreate_failed", {"ok": False, "reason": "create_agent_returned_none"}, "H8")
        return False
    except Exception as e:
        _dbg("agent_recreate_error", {"error": str(e), "type": type(e).__name__}, "H8")
        return False


def set_engine(e) -> None:
    global _engine
    _engine = e


def set_agent(agent_func) -> None:
    global _agent_func
    _agent_func = agent_func


def set_lock(lock: asyncio.Lock) -> None:
    global _lock
    _lock = lock


def _cap_decision_log() -> None:
    """Cap decision logs to 1000 entries."""
    if len(_decision_log) > 1000:
        _decision_log[:] = _decision_log[-1000:]
    if _engine and len(_engine.state.agent_decisions) > 1000:
        _engine.state.agent_decisions[:] = _engine.state.agent_decisions[-1000:]


class QueryRequest(BaseModel):
    message: str


async def _invoke_agent(prompt: str, timeout_s: float = 60.0):
    """Invoke agent with timeout and inflight guard.

    Important: if timeout occurs, the worker thread may still run.
    We keep _agent_inflight=True until the thread actually exits, so follow-up
    requests return 429 instead of hitting Strands ConcurrencyException.
    """
    global _agent_inflight, _agent_future, _agent_inflight_started_at

    now = __import__("time").time()

    if _agent_inflight:
        age_s = round(now - _agent_inflight_started_at, 2) if _agent_inflight_started_at else None
        future_done = bool(_agent_future.done()) if _agent_future is not None else None
        _dbg("agent_busy_state", {"age_s": age_s, "future_done": future_done}, "H7")
        # If previous future already finished but inflight wasn't cleared, recover automatically.
        if _agent_future is not None and _agent_future.done():
            _clear_inflight("future_done_recovered")
        elif age_s is not None and age_s > STALE_AGENT_SECONDS:
            _dbg("agent_stale_inflight_detected", {"age_s": age_s}, "H8")
            _clear_inflight("stale_inflight_forced_clear")
            recreated = await _recreate_agent()
            raise HTTPException(
                status_code=503,
                detail=(
                    "Previous agent request appears stuck and was reset. "
                    + ("Agent recovered; retry now." if recreated else "Recovery failed; retry or restart backend.")
                ),
            )
        else:
            _dbg("agent_busy_reject", {"reason": "inflight request still running"}, "H6")
            raise HTTPException(status_code=429, detail="Agent is busy processing a previous request. Please retry shortly.")

    if _agent_inflight:
        _dbg("agent_busy_reject", {"reason": "inflight request still running"}, "H6")
        raise HTTPException(status_code=429, detail="Agent is busy processing a previous request. Please retry shortly.")

    _agent_inflight = True
    _agent_inflight_started_at = now
    _dbg("agent_inflight_set", {"value": True}, "H6")
    loop = asyncio.get_running_loop()
    fut = loop.run_in_executor(None, _agent_func, prompt)
    _agent_future = fut

    def _on_done(_fut):
        _clear_inflight("future_done_callback")

    fut.add_done_callback(_on_done)

    try:
        # Shield keeps the executor future alive on timeout so inflight state
        # is only cleared by _on_done when the worker actually exits.
        return await asyncio.wait_for(asyncio.shield(fut), timeout=timeout_s)
    except asyncio.TimeoutError:
        _dbg("agent_timeout_background_continues", {"timeout_s": timeout_s}, "H6")
        # Don't clear inflight here; callback clears when thread really exits.
        raise


@router.post("/tick")
async def agent_tick():
    """Run one agent decision cycle."""
    _dbg("agent_tick_entry", {"agent_func_set": _agent_func is not None, "engine_set": _engine is not None}, "H4")
    if _agent_func is None:
        raise HTTPException(status_code=503, detail="Agent not configured. Set AWS credentials and restart.")
    if _engine is None:
        raise HTTPException(status_code=500, detail="Simulation engine not initialized")

    try:
        _dbg("agent_tick_invoke", {"sol": _engine.state.environment.sol, "tick": _engine.state.environment.tick}, "H5")
        prompt = (
            f"Analyze the current greenhouse state and make decisions. "
            f"Current sol: {_engine.state.environment.sol}, "
            f"tick: {_engine.state.environment.tick}. "
            f"Read sensors, check for any issues, and take appropriate actions."
        )
        result = await _invoke_agent(prompt, timeout_s=60.0)

        decision = {
            "sol": _engine.state.environment.sol,
            "tick": _engine.state.environment.tick,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "response": str(result),
        }
        _dbg("agent_tick_success", {"response_len": len(str(result)), "sol": decision["sol"]}, "H5")
        _decision_log.append(decision)
        _engine.state.agent_decisions.append(decision)
        _cap_decision_log()

        return decision
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Agent timed out (60s)")
    except HTTPException:
        raise
    except Exception as e:
        _dbg("agent_tick_error", {"error": str(e), "type": type(e).__name__}, "H5")
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")


@router.post("/query")
async def agent_query(req: QueryRequest):
    """Natural language query to the agent."""
    if _agent_func is None:
        raise HTTPException(status_code=503, detail="Agent not configured. Set AWS credentials and restart.")

    try:
        result = await _invoke_agent(req.message, timeout_s=60.0)
        response = {
            "query": req.message,
            "response": str(result),
            "sol": _engine.state.environment.sol if _engine else None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        _decision_log.append(response)
        _cap_decision_log()
        return response
    except HTTPException:
        raise
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Agent timed out (60s)")
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
