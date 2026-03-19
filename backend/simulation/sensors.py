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
    SENSOR_GROWTH_ANOMALY_NOISE_STD,
    SENSOR_HUMIDITY_NOISE_STD,
    SENSOR_LEAF_COLOR_NOISE_STD,
    SENSOR_PAR_NOISE_STD,
    SENSOR_PH_NOISE_STD,
    SENSOR_TEMP_NOISE_STD,
    SENSOR_WATER_QUALITY_NOISE_STD,
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


def _compute_leaf_color(crop, zone, zone_diseases):
    """Compute leaf color index (0-100, NDVI-mapped).

    Grounded in NDVI research: healthy vegetation 0.6-0.9,
    stress detectable below 0.4, disease range 0.3-0.5.
    Mapped to 0-100 scale (NDVI × 100).
    """
    from simulation.crops import CROP_DATABASE

    # Baseline: healthy crop at NDVI ~0.85 (mid-healthy range)
    base = 85.0

    # Health-driven NDVI decline
    # At health=50%, NDVI drops ~0.25 (from 0.85 to 0.60)
    # At health=0%, NDVI at ~0.15 (dead vegetation)
    health_penalty = (100 - crop.health) * 0.7

    # Disease-specific visual signatures
    disease_visual = 0.0
    for d in zone_diseases:
        if d.disease_type == "powdery_mildew":
            # Visible early: white mycelium on leaf surface reduces reflectance
            disease_visual += d.severity * 0.15
        elif d.disease_type == "pythium_root_rot":
            # Root disease: aerial NDVI symptoms lag root damage
            if d.stage != "incubating":
                disease_visual += d.severity * 0.25
        elif d.disease_type == "bacterial_wilt":
            # Rapid wilting → fast NDVI decline once symptomatic
            if d.stage != "incubating":
                disease_visual += d.severity * 0.35

    # Environmental stress also reduces NDVI (creates ambiguity)
    crop_data = CROP_DATABASE.get(crop.crop_name, {})
    t_min = crop_data.get("optimal_temp_min", 18)
    t_max = crop_data.get("optimal_temp_max", 26)
    env_stress = 0.0
    if zone.temperature < t_min - 3 or zone.temperature > t_max + 3:
        env_stress += 7.0
    if zone.par_level < crop_data.get("optimal_par", 300) * 0.5:
        env_stress += 5.0

    return max(0.0, min(100.0, base - health_penalty - disease_visual - env_stress))


def _compute_growth_anomaly(crop, zone, water_ok):
    """Growth rate deviation from expected (%).

    Uses existing stress multiplier. Research basis:
    - Pythium: 76-97% biomass reduction
    - Mildew: ~50% yield reduction
    - Bacterial wilt: 30-90%
    - >20% deviation distinguishes disease from environmental stress
    """
    from simulation.crops import CROP_DATABASE, compute_stress_multiplier

    crop_data = CROP_DATABASE.get(crop.crop_name, {})
    stress = compute_stress_multiplier(
        temp=zone.temperature,
        par=zone.par_level if zone.lighting_on else 0.0,
        water_available=water_ok,
        health=crop.health,
        crop_data=crop_data,
    )
    return round((stress - 1.0) * 100, 1)


def get_ground_truth(zone: Zone, state: GreenhouseState) -> dict:
    """Return exact simulation state for a zone (for frontend/debugging)."""
    return {
        "zone_id": zone.zone_id,
        "temperature": round(zone.temperature, 2),
        "humidity": round(zone.humidity, 2),
        "co2_ppm": round(zone.co2_ppm, 1),
        "par_level": round(zone.par_level, 1),
        "par_setpoint": round(zone.par_setpoint, 1),
        "temperature_setpoint": round(zone.temperature_setpoint, 2),
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
        "diseases": [
            {"disease_type": d.disease_type, "stage": d.stage, "severity": round(d.severity, 1)}
            for d in state.diseases if d.zone_id == zone.zone_id
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
        return round(_add_noise(true_value, noise_std), 2)

    zone_diseases = [d for d in state.diseases if d.zone_id == zid]

    # Water quality anomaly (renamed from water_contamination)
    # Per research: inline turbidity sensors have ±2% accuracy.
    # NTU alone cannot confirm pathogens — this is a general water quality anomaly.
    raw_contam = max((d.water_contamination for d in zone_diseases), default=0.0)
    # Incubation: pathogen load below turbidity sensor detection threshold
    if zone_diseases and all(d.stage == "incubating" for d in zone_diseases):
        raw_contam *= 0.3
    water_quality = _read("water_quality", raw_contam, SENSOR_WATER_QUALITY_NOISE_STD)
    if water_quality is not None:
        water_quality = round(max(0.0, min(1.0, water_quality)), 2)

    # Compute water availability for growth anomaly calculation
    water_ok = state.resources.water_reservoir_l > 10.0 and zone.irrigation_rate_l_per_hour > 0

    # Per-crop indirect disease indicators
    crop_readings = []
    for c in zone.crops:
        # Leaf color index (NDVI-mapped, 0-100)
        raw_leaf_color = _compute_leaf_color(c, zone, zone_diseases)
        leaf_color = _read("leaf_color", raw_leaf_color, SENSOR_LEAF_COLOR_NOISE_STD)
        if leaf_color is not None:
            leaf_color = round(max(0.0, min(100.0, leaf_color)), 1)

        # Growth rate anomaly (% deviation from expected)
        raw_growth_anomaly = _compute_growth_anomaly(c, zone, water_ok)
        growth_anomaly = _read("growth_anomaly", raw_growth_anomaly, SENSOR_GROWTH_ANOMALY_NOISE_STD)
        if growth_anomaly is not None:
            growth_anomaly = round(growth_anomaly, 1)

        crop_readings.append({
            "name": c.crop_name,
            "growth_stage": c.growth_stage.value,
            "health": round(c.health, 1) if not _is_sensor_failed(zid, "health") else None,
            "biomass_g": round(c.biomass_g, 1) if not _is_sensor_failed(zid, "biomass") else None,
            "days_to_harvest": round(max(0, c.days_to_harvest - c.days_planted), 1),
            "leaf_color_index": leaf_color,
            "growth_rate_anomaly": growth_anomaly,
        })

    return {
        "zone_id": zid,
        "temperature": _read("temperature", zone.temperature, SENSOR_TEMP_NOISE_STD),
        "humidity": _read("humidity", zone.humidity, SENSOR_HUMIDITY_NOISE_STD),
        "co2_ppm": _read("co2", zone.co2_ppm, SENSOR_CO2_NOISE_STD),
        "par_level": _read("par", zone.par_level, SENSOR_PAR_NOISE_STD),
        "lighting_on": zone.lighting_on,
        "irrigation_rate": round(zone.irrigation_rate_l_per_hour, 3),
        "is_quarantined": zone.is_quarantined,
        "water_quality_anomaly": water_quality,
        "crops": crop_readings,
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
