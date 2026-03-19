"""Event trigger API routes."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from simulation.engine import SimulationEngine

router = APIRouter(prefix="/events", tags=["events"])

engine: SimulationEngine | None = None


def set_engine(e: SimulationEngine) -> None:
    global engine
    engine = e


def _engine() -> SimulationEngine:
    if engine is None:
        raise HTTPException(status_code=500, detail="Simulation engine not initialized")
    return engine


class DustStormRequest(BaseModel):
    severity: str = "regional"  # "regional" or "global"
    opacity_tau: Optional[float] = None
    duration_sols: Optional[int] = None


class DiseaseRequest(BaseModel):
    zone_id: str = "C"
    disease_type: str = "pythium_root_rot"


class PowerFailureRequest(BaseModel):
    reduction: float = 0.5  # fraction of power lost


class SensorFailureRequest(BaseModel):
    zone_id: str = "A"
    sensor_name: str = "temperature"
    duration_ticks: int = 10


class CropFailureRequest(BaseModel):
    zone_id: str = "C"
    crop_name: Optional[str] = None  # None = all crops in zone


@router.post("/dust-storm")
def trigger_dust_storm(req: DustStormRequest):
    params = req.model_dump(exclude_none=True)
    return _engine().trigger_event("dust_storm", params)


@router.post("/disease")
def trigger_disease(req: DiseaseRequest):
    return _engine().trigger_event("disease", req.model_dump())


@router.post("/power-failure")
def trigger_power_failure(req: PowerFailureRequest):
    return _engine().trigger_event("power_failure", req.model_dump())


@router.post("/sensor-failure")
def trigger_sensor_failure(req: SensorFailureRequest):
    return _engine().trigger_event("sensor_failure", req.model_dump())


@router.post("/crop-failure")
def trigger_crop_failure(req: CropFailureRequest):
    return _engine().trigger_event("crop_failure", req.model_dump(exclude_none=True))


@router.get("/log")
def get_event_log():
    """Return event history."""
    e = _engine()
    return {
        "count": len(e.state.event_log),
        "events": [ev.model_dump() for ev in e.state.event_log],
    }
