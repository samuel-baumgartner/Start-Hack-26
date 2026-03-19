"""Event trigger API routes."""

from __future__ import annotations

import asyncio
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from simulation.engine import SimulationEngine

router = APIRouter(prefix="/events", tags=["events"])

engine: SimulationEngine | None = None
_lock: asyncio.Lock | None = None


def set_engine(e: SimulationEngine) -> None:
    global engine
    engine = e


def set_lock(lock: asyncio.Lock) -> None:
    global _lock
    _lock = lock


def _engine() -> SimulationEngine:
    if engine is None:
        raise HTTPException(status_code=500, detail="Simulation engine not initialized")
    return engine


class DustStormRequest(BaseModel):
    severity: str = "regional"  # "regional" or "global"
    opacity_tau: Optional[float] = None
    duration_sols: Optional[int] = None


class DiseaseRequest(BaseModel):
    zone_id: str = Field(default="C", min_length=1)
    disease_type: str = "pythium_root_rot"


class PowerFailureRequest(BaseModel):
    reduction: float = 0.5  # fraction of power lost


class SensorFailureRequest(BaseModel):
    zone_id: str = Field(default="A", min_length=1)
    sensor_name: str = "temperature"
    duration_ticks: int = 10


class CropFailureRequest(BaseModel):
    zone_id: str = Field(default="C", min_length=1)
    crop_name: Optional[str] = None  # None = all crops in zone


def _check_event_result(result: dict) -> dict:
    """Raise HTTP 400 if event returned an app-level error."""
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/dust-storm")
async def trigger_dust_storm(req: DustStormRequest):
    params = req.model_dump(exclude_none=True)
    if _lock:
        async with _lock:
            return _check_event_result(_engine().trigger_event("dust_storm", params))
    return _check_event_result(_engine().trigger_event("dust_storm", params))


@router.post("/disease")
async def trigger_disease(req: DiseaseRequest):
    if _lock:
        async with _lock:
            return _check_event_result(_engine().trigger_event("disease", req.model_dump()))
    return _check_event_result(_engine().trigger_event("disease", req.model_dump()))


@router.post("/power-failure")
async def trigger_power_failure(req: PowerFailureRequest):
    if _lock:
        async with _lock:
            return _check_event_result(_engine().trigger_event("power_failure", req.model_dump()))
    return _check_event_result(_engine().trigger_event("power_failure", req.model_dump()))


@router.post("/sensor-failure")
async def trigger_sensor_failure(req: SensorFailureRequest):
    if _lock:
        async with _lock:
            return _check_event_result(_engine().trigger_event("sensor_failure", req.model_dump()))
    return _check_event_result(_engine().trigger_event("sensor_failure", req.model_dump()))


@router.post("/crop-failure")
async def trigger_crop_failure(req: CropFailureRequest):
    if _lock:
        async with _lock:
            return _check_event_result(_engine().trigger_event("crop_failure", req.model_dump(exclude_none=True)))
    return _check_event_result(_engine().trigger_event("crop_failure", req.model_dump(exclude_none=True)))


@router.get("/log")
def get_event_log():
    """Return event history."""
    e = _engine()
    return {
        "count": len(e.state.event_log),
        "events": [ev.model_dump() for ev in e.state.event_log],
    }
