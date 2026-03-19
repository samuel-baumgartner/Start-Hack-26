"""FastAPI app: CORS, routers, auto-tick loop, SSE stream."""

from __future__ import annotations

import asyncio
import json
import logging
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from simulation.engine import SimulationEngine
from simulation.sensors import get_all_ground_truth

# Ensure backend/ is on the Python path
sys.path.insert(0, ".")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global simulation engine
engine = SimulationEngine()

# Auto-tick state
auto_tick_task: asyncio.Task | None = None
auto_tick_interval: float = 2.0  # seconds between ticks
auto_tick_enabled: bool = False

# SSE subscribers
sse_queues: list[asyncio.Queue] = []


async def auto_tick_loop():
    """Background loop: tick simulation every N seconds."""
    global auto_tick_enabled
    while auto_tick_enabled:
        engine.tick(1)

        # Broadcast to SSE subscribers
        state_snapshot = {
            "sol": engine.state.environment.sol,
            "tick": engine.state.environment.tick,
            "total_ticks": engine.state.environment.total_ticks,
            "is_daytime": engine.state.environment.is_daytime,
            "dust_storm_active": engine.state.environment.dust_storm_active,
            "water_reservoir_l": round(engine.state.resources.water_reservoir_l, 1),
            "battery_percent": round(
                engine.state.resources.battery_charge_kwh
                / engine.state.resources.battery_capacity_kwh
                * 100,
                1,
            ),
            "power_generation_kw": round(engine.state.resources.power_generation_kw, 2),
            "power_consumption_kw": round(engine.state.resources.power_consumption_kw, 2),
        }

        for q in sse_queues:
            try:
                q.put_nowait(state_snapshot)
            except asyncio.QueueFull:
                pass  # drop if subscriber is too slow

        await asyncio.sleep(auto_tick_interval)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """App startup/shutdown."""
    # Wire up engine to all route modules
    from api.simulation_routes import set_engine as set_sim_engine
    from api.event_routes import set_engine as set_event_engine
    from api.agent_routes import set_engine as set_agent_engine

    set_sim_engine(engine)
    set_event_engine(engine)
    set_agent_engine(engine)

    # Try to create agent (needs AWS creds)
    mcp_client = None
    try:
        from agent.greenhouse_agent import create_agent
        from agent.tools import set_engine as set_tools_engine
        from api.agent_routes import set_agent

        set_tools_engine(engine)
        agent, mcp_client = await asyncio.to_thread(create_agent)
        if agent:
            set_agent(agent)
            logger.info("AI agent initialized successfully")
        else:
            logger.warning("AI agent not available (check AWS credentials)")
    except Exception as e:
        logger.warning(f"Could not initialize agent: {e}")

    logger.info("Mars Greenhouse Simulation ready!")
    yield
    # Shutdown
    global auto_tick_enabled
    auto_tick_enabled = False
    if mcp_client:
        try:
            mcp_client.stop(None, None, None)
            logger.info("MCP client stopped")
        except RuntimeError as e:
            logger.warning("MCP client stop raised (connection was already broken): %s", e)
        except Exception as e:
            logger.warning("MCP client stop failed: %s", e)


app = FastAPI(
    title="Mars Greenhouse Simulator",
    description="Simulation engine + AI agent for autonomous Martian greenhouse management",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: allow all origins (hackathon)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
from api.simulation_routes import router as sim_router
from api.event_routes import router as event_router
from api.agent_routes import router as agent_router

app.include_router(sim_router)
app.include_router(event_router)
app.include_router(agent_router)


# Auto-tick control endpoints
@app.post("/auto-tick/start")
async def start_auto_tick(interval: float = Query(default=2.0, ge=0.1, le=30.0)):
    """Start auto-tick background loop."""
    global auto_tick_task, auto_tick_enabled, auto_tick_interval
    if auto_tick_enabled:
        return {"status": "already running", "interval": auto_tick_interval}

    auto_tick_interval = interval
    auto_tick_enabled = True
    auto_tick_task = asyncio.create_task(auto_tick_loop())
    return {"status": "started", "interval": interval}


@app.post("/auto-tick/stop")
async def stop_auto_tick():
    """Stop auto-tick background loop."""
    global auto_tick_enabled, auto_tick_task
    auto_tick_enabled = False
    if auto_tick_task:
        auto_tick_task.cancel()
        auto_tick_task = None
    return {"status": "stopped"}


@app.get("/auto-tick/status")
def auto_tick_status():
    return {"enabled": auto_tick_enabled, "interval": auto_tick_interval}


# SSE stream endpoint
@app.get("/sim/stream")
async def sim_stream():
    """Server-Sent Events stream for real-time frontend updates."""
    queue: asyncio.Queue = asyncio.Queue(maxsize=50)
    sse_queues.append(queue)

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            while True:
                data = await queue.get()
                yield f"data: {json.dumps(data)}\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            sse_queues.remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.get("/")
def root():
    return {
        "name": "Mars Greenhouse Simulator",
        "version": "1.0.0",
        "endpoints": {
            "docs": "/docs",
            "state": "/sim/state",
            "sensors": "/sim/sensors",
            "tick": "/sim/tick",
            "stream": "/sim/stream",
            "events": "/events/log",
            "nutrition": "/sim/nutrition",
            "optimize": "/sim/optimize",
            "agent_tick": "/agent/tick",
            "agent_query": "/agent/query",
        },
    }
