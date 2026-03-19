"""Simulation API routes."""

from __future__ import annotations

import asyncio
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from simulation.engine import SimulationEngine
from simulation.nutrition import compute_nutrition_coverage, optimize_crop_allocation
from simulation.sensors import get_all_ground_truth, get_all_sensor_readings, get_sensor_readings, get_ground_truth

router = APIRouter(prefix="/sim", tags=["simulation"])

# Shared engine instance — set from main.py
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


# Auto-tick stopper callback — set from main.py
_auto_tick_stopper = None


def set_auto_tick_stopper(fn) -> None:
    global _auto_tick_stopper
    _auto_tick_stopper = fn


class TickRequest(BaseModel):
    n: int = Field(default=1, ge=1, le=1000)


class CommandRequest(BaseModel):
    action: str = Field(min_length=1)
    zone_id: Optional[str] = None
    params: dict = {}


class OptimizeRequest(BaseModel):
    area_m2: Optional[float] = Field(default=None, ge=0)
    water_budget_l_per_day: Optional[float] = Field(default=None, ge=0)
    power_budget_kw: Optional[float] = Field(default=None, ge=0)


@router.get("/state")
def get_state():
    """Full ground-truth greenhouse state."""
    e = _engine()
    zones_truth = get_all_ground_truth(e.state)
    return {
        "sol": e.state.environment.sol,
        "tick": e.state.environment.tick,
        "total_ticks": e.state.environment.total_ticks,
        "is_daytime": e.state.environment.is_daytime,
        "environment": {
            "external_temp_c": e.state.environment.external_temp_c,
            "solar_irradiance": e.state.environment.solar_irradiance_w_m2,
            "dust_opacity_tau": e.state.environment.dust_opacity_tau,
            "dust_storm_active": e.state.environment.dust_storm_active,
            "dust_storm_remaining_sols": e.state.environment.dust_storm_remaining_sols,
            "disease_active": e.state.environment.disease_active,
            "disease_zone_id": e.state.environment.disease_zone_id,
            "power_failure_active": e.state.environment.power_failure_active,
            "pressure_kpa": e.state.environment.pressure_kpa,
            "o2_percent": e.state.environment.o2_percent,
        },
        "resources": {
            "water_reservoir_l": e.state.resources.water_reservoir_l,
            "water_consumed_today_l": e.state.resources.water_consumed_today_l,
            "nutrient_ph": e.state.resources.nutrient_solution_ph,
            "nutrient_ec": e.state.resources.nutrient_solution_ec,
            "power_generation_kw": e.state.resources.power_generation_kw,
            "power_consumption_kw": e.state.resources.power_consumption_kw,
            "battery_charge_kwh": e.state.resources.battery_charge_kwh,
            "battery_percent": round(
                e.state.resources.battery_charge_kwh / e.state.resources.battery_capacity_kwh * 100, 1
            ),
            "solar_panel_efficiency": e.state.resources.solar_panel_efficiency,
        },
        "zones": zones_truth,
        "event_log_count": len(e.state.event_log),
        "agent_decisions_count": len(e.state.agent_decisions),
    }


@router.get("/sensors")
def get_all_sensors():
    """All sensor readings (what the agent sees, with noise/failures)."""
    return get_all_sensor_readings(_engine().state)


@router.get("/sensors/{zone_id}")
def get_zone_sensors(zone_id: str):
    """Sensor readings for a specific zone."""
    e = _engine()
    zone_id_upper = zone_id.upper()
    for zone in e.state.zones:
        if zone.zone_id == zone_id_upper:
            return get_sensor_readings(zone, e.state)
    raise HTTPException(status_code=404, detail=f"Zone {zone_id} not found")


@router.post("/tick")
async def tick(req: TickRequest):
    """Advance simulation by N ticks."""
    e = _engine()
    if _lock:
        async with _lock:
            e.tick(req.n)
    else:
        e.tick(req.n)
    return get_state()


@router.post("/command")
async def apply_command(req: CommandRequest):
    """Apply a command to the simulation."""
    if _lock:
        async with _lock:
            result = _engine().apply_command(req.model_dump())
    else:
        result = _engine().apply_command(req.model_dump())
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/reset")
async def reset():
    """Reset simulation to initial state."""
    from api.agent_routes import clear_decisions
    if _auto_tick_stopper:
        await _auto_tick_stopper()
    if _lock:
        async with _lock:
            _engine().reset()
    else:
        _engine().reset()
    clear_decisions()
    return {"status": "ok", "state": get_state()}


@router.get("/nutrition")
def get_nutrition():
    """Current nutritional coverage."""
    return compute_nutrition_coverage(_engine().state)


@router.post("/optimize")
def optimize(req: OptimizeRequest):
    """Run crop allocation optimizer."""
    return optimize_crop_allocation(
        available_area_m2=req.area_m2,
        water_budget_l_per_day=req.water_budget_l_per_day,
        power_budget_kw=req.power_budget_kw,
    )
