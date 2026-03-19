"""Sensor abstraction layer: noisy/delayed readings vs ground truth.

The agent sees sensor readings (with noise, possible failures, staleness).
The frontend debugging view sees ground truth.
"""

from __future__ import annotations

import random
from typing import Any, Optional

from config import (
    SENSOR_CO2_NOISE_STD,
    SENSOR_EC_NOISE_STD,
    SENSOR_FAILURE_PROBABILITY,
    SENSOR_HUMIDITY_NOISE_STD,
    SENSOR_PAR_NOISE_STD,
    SENSOR_PH_NOISE_STD,
    SENSOR_TEMP_NOISE_STD,
)
from simulation.state import GreenhouseState, Zone


# Track sensor failures per zone: {zone_id: {sensor_name: ticks_remaining}}
_sensor_failures: dict[str, dict[str, int]] = {}

# Track stale readings: {zone_id: {sensor_name: last_value}}
_stale_readings: dict[str, dict[str, Any]] = {}


def reset_sensor_state() -> None:
    """Reset all sensor failure/staleness state."""
    global _sensor_failures, _stale_readings
    _sensor_failures = {}
    _stale_readings = {}


def fail_sensor(zone_id: str, sensor_name: str, duration_ticks: int = 10) -> None:
    """Manually fail a specific sensor in a zone."""
    if zone_id not in _sensor_failures:
        _sensor_failures[zone_id] = {}
    _sensor_failures[zone_id][sensor_name] = duration_ticks


def _add_noise(value: float, std: float) -> float:
    """Add Gaussian noise to a sensor reading."""
    return value + random.gauss(0, std)


def _is_sensor_failed(zone_id: str, sensor_name: str) -> bool:
    """Check if a sensor is currently failed."""
    if zone_id in _sensor_failures:
        return _sensor_failures[zone_id].get(sensor_name, 0) > 0
    return False


def tick_sensor_failures() -> None:
    """Decrement failure timers each tick."""
    for zone_id in list(_sensor_failures.keys()):
        for sensor in list(_sensor_failures[zone_id].keys()):
            _sensor_failures[zone_id][sensor] -= 1
            if _sensor_failures[zone_id][sensor] <= 0:
                del _sensor_failures[zone_id][sensor]
        if not _sensor_failures[zone_id]:
            del _sensor_failures[zone_id]


def get_ground_truth(zone: Zone, state: GreenhouseState) -> dict:
    """Return exact simulation state for a zone (for frontend/debugging)."""
    return {
        "zone_id": zone.zone_id,
        "temperature": round(zone.temperature, 2),
        "humidity": round(zone.humidity, 2),
        "co2_ppm": round(zone.co2_ppm, 1),
        "par_level": round(zone.par_level, 1),
        "lighting_on": zone.lighting_on,
        "irrigation_rate": round(zone.irrigation_rate_l_per_hour, 3),
        "is_quarantined": zone.is_quarantined,
        "priority": zone.priority,
        "crops": [
            {
                "name": c.crop_name,
                "growth_stage": c.growth_stage.value,
                "days_planted": round(c.days_planted, 1),
                "health": round(c.health, 1),
                "biomass_g": round(c.biomass_g, 1),
                "days_to_harvest": round(max(0, c.days_to_harvest - c.days_planted), 1),
            }
            for c in zone.crops
        ],
        "environment": {
            "sol": state.environment.sol,
            "is_daytime": state.environment.is_daytime,
            "external_temp": round(state.environment.external_temp_c, 1),
            "solar_irradiance": round(state.environment.solar_irradiance_w_m2, 1),
            "dust_opacity": round(state.environment.dust_opacity_tau, 2),
            "pressure_kpa": round(state.environment.pressure_kpa, 1),
            "o2_percent": round(state.environment.o2_percent, 1),
        },
        "resources": {
            "water_reservoir_l": round(state.resources.water_reservoir_l, 1),
            "ph": round(state.resources.nutrient_solution_ph, 2),
            "ec": round(state.resources.nutrient_solution_ec, 2),
            "power_generation_kw": round(state.resources.power_generation_kw, 2),
            "power_consumption_kw": round(state.resources.power_consumption_kw, 2),
            "battery_percent": round(
                state.resources.battery_charge_kwh
                / state.resources.battery_capacity_kwh
                * 100,
                1,
            ),
        },
    }


def get_sensor_readings(zone: Zone, state: GreenhouseState) -> dict:
    """Return what the agent sees — noisy, possibly failed sensor readings."""
    zid = zone.zone_id

    def _read(sensor_name: str, true_value: float, noise_std: float) -> Optional[float]:
        if _is_sensor_failed(zid, sensor_name):
            return None  # sensor offline
        # Random spontaneous failure
        if random.random() < SENSOR_FAILURE_PROBABILITY:
            return None
        return round(_add_noise(true_value, noise_std), 2)

    return {
        "zone_id": zid,
        "temperature": _read("temperature", zone.temperature, SENSOR_TEMP_NOISE_STD),
        "humidity": _read("humidity", zone.humidity, SENSOR_HUMIDITY_NOISE_STD),
        "co2_ppm": _read("co2", zone.co2_ppm, SENSOR_CO2_NOISE_STD),
        "par_level": _read("par", zone.par_level, SENSOR_PAR_NOISE_STD),
        "lighting_on": zone.lighting_on,
        "irrigation_rate": round(zone.irrigation_rate_l_per_hour, 3),
        "is_quarantined": zone.is_quarantined,
        "crops": [
            {
                "name": c.crop_name,
                "growth_stage": c.growth_stage.value,
                "health": round(c.health, 1) if not _is_sensor_failed(zid, "health") else None,
                "biomass_g": round(c.biomass_g, 1) if not _is_sensor_failed(zid, "biomass") else None,
                "days_to_harvest": round(max(0, c.days_to_harvest - c.days_planted), 1),
            }
            for c in zone.crops
        ],
        "resources": {
            "water_reservoir_l": _read(
                "water_level", state.resources.water_reservoir_l, 5.0
            ),
            "ph": _read("ph", state.resources.nutrient_solution_ph, SENSOR_PH_NOISE_STD),
            "ec": _read("ec", state.resources.nutrient_solution_ec, SENSOR_EC_NOISE_STD),
            "battery_percent": _read(
                "battery",
                state.resources.battery_charge_kwh
                / state.resources.battery_capacity_kwh
                * 100,
                1.0,
            ),
        },
    }


def get_all_sensor_readings(state: GreenhouseState) -> list[dict]:
    """Get sensor readings for all zones."""
    return [get_sensor_readings(zone, state) for zone in state.zones]


def get_all_ground_truth(state: GreenhouseState) -> list[dict]:
    """Get ground truth for all zones."""
    return [get_ground_truth(zone, state) for zone in state.zones]
