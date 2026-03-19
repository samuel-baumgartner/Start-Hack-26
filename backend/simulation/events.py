"""Crisis event system: dust storms, disease, power failure, sensor failure."""

from __future__ import annotations

import random
from typing import TYPE_CHECKING

from simulation.sensors import fail_sensor
from simulation.state import EventLogEntry

if TYPE_CHECKING:
    from simulation.engine import SimulationEngine


def trigger_event(engine: SimulationEngine, event_type: str, params: dict) -> dict:
    """Trigger a crisis event and return result."""
    handlers = {
        "dust_storm": _trigger_dust_storm,
        "disease": _trigger_disease,
        "power_failure": _trigger_power_failure,
        "sensor_failure": _trigger_sensor_failure,
        "crop_failure": _trigger_crop_failure,
    }

    handler = handlers.get(event_type)
    if not handler:
        return {"status": "error", "message": f"Unknown event type: {event_type}"}

    return handler(engine, params)


def _trigger_dust_storm(engine: SimulationEngine, params: dict) -> dict:
    """Dust storm: high opacity, reduced solar, lasts 7-90 sols."""
    env = engine.state.environment

    if env.dust_storm_active:
        return {"status": "error", "message": "Dust storm already active"}

    severity = params.get("severity", "regional")
    if severity == "global":
        tau = random.uniform(4.0, 5.5)
        duration = random.randint(30, 90)
    else:
        tau = random.uniform(2.0, 4.0)
        duration = random.randint(7, 21)

    # Allow overrides, clamping to valid ranges
    tau = max(0.0, params.get("opacity_tau", tau))
    duration = max(1, params.get("duration_sols", duration))

    env.dust_storm_active = True
    env.dust_opacity_tau = tau
    env.dust_storm_remaining_sols = duration

    desc = f"Dust storm ({severity}) started: tau={tau:.1f}, duration={duration} sols"
    engine._log_event(
        "dust_storm_start",
        desc,
        zones=[z.zone_id for z in engine.state.zones],
        params={"severity": severity, "tau": tau, "duration": duration},
    )

    return {"status": "ok", "message": desc, "tau": tau, "duration_sols": duration}


def _trigger_disease(engine: SimulationEngine, params: dict) -> dict:
    """Disease outbreak: targets a zone, drains health per tick, can spread."""
    zone_id = params.get("zone_id", "C")
    disease_type = params.get("disease_type", "pythium_root_rot")

    zone = engine._get_zone(zone_id)
    if not zone:
        return {"status": "error", "message": f"Zone {zone_id} not found"}

    env = engine.state.environment
    env.disease_active = True
    env.disease_zone_id = zone_id

    desc = f"Disease outbreak ({disease_type}) detected in Zone {zone_id}"
    engine._log_event(
        "disease_outbreak",
        desc,
        zones=[zone_id],
        params={"disease_type": disease_type, "zone_id": zone_id},
    )

    return {"status": "ok", "message": desc, "zone_id": zone_id, "disease_type": disease_type}


def _trigger_power_failure(engine: SimulationEngine, params: dict) -> dict:
    """Power failure: reduces generation by specified fraction."""
    reduction = params.get("reduction", 0.5)  # 50% default
    clamped = min(1.0, max(0.0, reduction))

    env = engine.state.environment
    env.power_failure_active = True
    env.power_failure_reduction = clamped

    desc = f"Power failure: {clamped*100:.0f}% generation reduction"
    engine._log_event(
        "power_failure",
        desc,
        params={"reduction": clamped},
    )

    return {"status": "ok", "message": desc, "reduction": clamped}


VALID_SENSORS = {"temperature", "humidity", "co2", "par", "health", "biomass", "water_level", "ph", "ec", "battery"}


def _trigger_sensor_failure(engine: SimulationEngine, params: dict) -> dict:
    """Fail a specific sensor in a zone."""
    zone_id = params.get("zone_id", "A")
    sensor_name = params.get("sensor_name", "temperature")
    duration = max(1, params.get("duration_ticks", 10))

    # Validate zone exists
    zone = engine._get_zone(zone_id)
    if not zone:
        return {"status": "error", "message": f"Zone {zone_id} not found"}

    # Validate sensor name
    if sensor_name not in VALID_SENSORS:
        return {"status": "error", "message": f"Unknown sensor: {sensor_name}. Valid: {VALID_SENSORS}"}

    fail_sensor(zone_id, sensor_name, duration)

    desc = f"Sensor failure: {sensor_name} in Zone {zone_id} (duration: {duration} ticks)"
    engine._log_event(
        "sensor_failure",
        desc,
        zones=[zone_id],
        params={"sensor_name": sensor_name, "duration_ticks": duration},
    )

    return {"status": "ok", "message": desc}


def _trigger_crop_failure(engine: SimulationEngine, params: dict) -> dict:
    """Set crop health to 0 in a zone."""
    zone_id = params.get("zone_id", "C")
    crop_name = params.get("crop_name")  # None = all crops in zone

    zone = engine._get_zone(zone_id)
    if not zone:
        return {"status": "error", "message": f"Zone {zone_id} not found"}

    affected = []
    for crop in zone.crops:
        if crop_name is None or crop.crop_name == crop_name:
            crop.health = 0.0
            affected.append(crop.crop_name)

    if crop_name and not affected:
        return {"status": "error", "message": f"Crop {crop_name} not found in Zone {zone_id}"}

    desc = f"Crop failure in Zone {zone_id}: {', '.join(affected)}"
    engine._log_event("crop_failure", desc, zones=[zone_id], params={"crops": affected})

    return {"status": "ok", "message": desc, "affected_crops": affected}
