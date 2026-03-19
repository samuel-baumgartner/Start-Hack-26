"""Agent tool functions that interface with the simulation.

These use get_sensor_readings() (never raw state) for reads,
and engine.apply_command() for writes.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

from strands import tool

if TYPE_CHECKING:
    from simulation.engine import SimulationEngine

# Will be set when agent is initialized
_engine: SimulationEngine | None = None


def set_engine(e: SimulationEngine) -> None:
    global _engine
    _engine = e


def _get_engine() -> "SimulationEngine":
    if _engine is None:
        raise RuntimeError("Engine not set for agent tools")
    return _engine


@tool
def read_sensors(zone_id: str | None = None) -> dict:
    """Read sensor data from the greenhouse. Returns noisy sensor readings.

    Args:
        zone_id: Specific zone to read (A-F), or None for all zones.
    """
    from simulation.sensors import get_all_sensor_readings, get_sensor_readings

    e = _get_engine()
    if zone_id:
        for zone in e.state.zones:
            if zone.zone_id == zone_id:
                return get_sensor_readings(zone, e.state)
        return {"error": f"Zone {zone_id} not found"}
    return {"zones": get_all_sensor_readings(e.state)}


@tool
def get_greenhouse_status() -> dict:
    """Get overall greenhouse status summary."""
    e = _get_engine()
    env = e.state.environment
    res = e.state.resources
    return {
        "sol": env.sol,
        "tick": env.tick,
        "is_daytime": env.is_daytime,
        "dust_storm_active": env.dust_storm_active,
        "disease_active": env.disease_active,
        "power_failure_active": env.power_failure_active,
        "water_reservoir_l": round(res.water_reservoir_l, 1),
        "battery_percent": round(res.battery_charge_kwh / res.battery_capacity_kwh * 100, 1),
        "num_zones": len(e.state.zones),
        "active_zones": sum(1 for z in e.state.zones if not z.is_quarantined),
    }


@tool
def adjust_irrigation(zone_id: str, rate_l_per_hour: float) -> dict:
    """Adjust irrigation rate for a zone.

    Args:
        zone_id: Zone identifier (A-F)
        rate_l_per_hour: New irrigation rate in liters per hour
    """
    return _get_engine().apply_command({
        "action": "adjust_irrigation",
        "zone_id": zone_id,
        "params": {"rate": rate_l_per_hour},
    })


@tool
def adjust_temperature(zone_id: str, target_celsius: float) -> dict:
    """Adjust temperature target for a zone.

    Args:
        zone_id: Zone identifier (A-F)
        target_celsius: Target temperature in Celsius
    """
    return _get_engine().apply_command({
        "action": "adjust_temperature",
        "zone_id": zone_id,
        "params": {"target": target_celsius},
    })


@tool
def adjust_lighting(zone_id: str, on: bool = True, par: float = 400, photoperiod: float = 18) -> dict:
    """Adjust lighting for a zone.

    Args:
        zone_id: Zone identifier (A-F)
        on: Whether lighting is on
        par: PAR level in µmol/m²/s
        photoperiod: Hours of light per day
    """
    return _get_engine().apply_command({
        "action": "adjust_lighting",
        "zone_id": zone_id,
        "params": {"on": on, "par": par, "photoperiod": photoperiod},
    })


@tool
def set_zone_priority(zone_id: str, priority: str) -> dict:
    """Set zone priority for resource allocation.

    Args:
        zone_id: Zone identifier (A-F)
        priority: One of "normal", "high", "low", "hibernate", "sacrifice"
    """
    return _get_engine().apply_command({
        "action": "set_zone_priority",
        "zone_id": zone_id,
        "params": {"priority": priority},
    })


@tool
def quarantine_zone(zone_id: str, quarantine: bool = True) -> dict:
    """Quarantine or un-quarantine a zone (for disease containment).

    Args:
        zone_id: Zone identifier (A-F)
        quarantine: True to quarantine, False to release
    """
    return _get_engine().apply_command({
        "action": "quarantine_zone",
        "zone_id": zone_id,
        "params": {"quarantine": quarantine},
    })


@tool
def harvest_crop(zone_id: str, crop_name: str) -> dict:
    """Harvest a mature crop from a zone.

    Args:
        zone_id: Zone identifier (A-F)
        crop_name: Name of the crop to harvest
    """
    return _get_engine().apply_command({
        "action": "harvest_crop",
        "zone_id": zone_id,
        "params": {"crop_name": crop_name},
    })


@tool
def plant_crop(zone_id: str, crop_name: str) -> dict:
    """Plant a new crop in a zone.

    Args:
        zone_id: Zone identifier (A-F)
        crop_name: Name of the crop to plant
    """
    return _get_engine().apply_command({
        "action": "plant_crop",
        "zone_id": zone_id,
        "params": {"crop_name": crop_name},
    })


@tool
def deploy_microgreens() -> dict:
    """Deploy emergency microgreen trays for rapid nutrition recovery."""
    return _get_engine().apply_command({"action": "deploy_microgreens"})


@tool
def get_nutrition_status() -> dict:
    """Get current nutritional coverage analysis."""
    from simulation.nutrition import compute_nutrition_coverage
    return compute_nutrition_coverage(_get_engine().state)
