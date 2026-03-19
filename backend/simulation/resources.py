"""Water, power, and nutrient tracking."""

from __future__ import annotations

import math

from config import (
    BATTERY_CAPACITY_KWH,
    MARS_SOLAR_IRRADIANCE_MAX,
    POWER_HEATING_KW,
    POWER_LIFE_SUPPORT_KW,
    POWER_LIGHTING_PER_ZONE_KW,
    POWER_MONITORING_KW,
    POWER_PUMPS_KW,
    SIMULATION_TICK_HOURS,
)
from simulation.state import GreenhouseState, Zone


def compute_water_consumption(zones: list[Zone], dt_hours: float) -> float:
    """Total water consumed by all zones in the time step."""
    total = 0.0
    for zone in zones:
        if zone.is_quarantined:
            continue
        irrigation_factor = zone.irrigation_rate_l_per_hour / 0.5  # 0.5 is default
        for crop in zone.crops:
            if crop.health <= 0:
                continue
            area_per_crop = zone.area_m2 / max(len(zone.crops), 1)
            crop_consumption = crop.water_use_l_per_m2_per_day * area_per_crop * (dt_hours / 24.0)
            total += crop_consumption * max(0.0, irrigation_factor)
    return total


def update_water(state: GreenhouseState, dt_hours: float) -> None:
    """Update water reservoir: consumption minus recycling recovery."""
    consumed = compute_water_consumption(state.zones, dt_hours)
    recycled = consumed * state.resources.water_recycling_efficiency
    net_loss = consumed - recycled

    state.resources.water_consumed_today_l += consumed
    state.resources.water_reservoir_l = max(0.0, state.resources.water_reservoir_l - net_loss)


def compute_solar_power(solar_irradiance: float, panel_efficiency: float) -> float:
    """Solar power generation based on current irradiance.

    Assumes ~50 m² of solar panels with ~20% efficiency.
    """
    panel_area = 50.0  # m²
    panel_eff = 0.20 * panel_efficiency  # base efficiency * degradation
    raw_power = solar_irradiance * panel_area * panel_eff / 1000.0  # kW
    return raw_power


def compute_power_consumption(zones: list[Zone], heating_needed: bool) -> float:
    """Total power consumption from all subsystems."""
    lighting = sum(
        POWER_LIGHTING_PER_ZONE_KW for z in zones if z.lighting_on and not z.is_quarantined
    )
    heating = POWER_HEATING_KW if heating_needed else 0.5  # minimal standby
    pumps = POWER_PUMPS_KW
    monitoring = POWER_MONITORING_KW
    life_support = POWER_LIFE_SUPPORT_KW

    return lighting + heating + pumps + monitoring + life_support


def update_power(state: GreenhouseState, solar_irradiance: float, dt_hours: float) -> None:
    """Update power generation, consumption, and battery state."""
    generation = compute_solar_power(
        solar_irradiance, state.resources.solar_panel_efficiency
    )

    # Apply power failure reduction
    if state.environment.power_failure_active:
        generation *= (1.0 - state.environment.power_failure_reduction)

    heating_needed = any(z.temperature < 20.0 for z in state.zones)
    consumption = compute_power_consumption(state.zones, heating_needed)

    state.resources.power_generation_kw = generation
    state.resources.power_consumption_kw = consumption

    # Battery: charge/discharge
    net_power = generation - consumption
    energy_delta = net_power * dt_hours  # kWh

    new_charge = state.resources.battery_charge_kwh + energy_delta
    state.resources.battery_charge_kwh = max(
        0.0, min(BATTERY_CAPACITY_KWH, new_charge)
    )


def update_nutrient_solution(state: GreenhouseState, dt_hours: float) -> None:
    """Nutrient solution pH and EC drift over time."""
    # pH drifts up slightly as plants absorb nutrients
    active_zones = sum(1 for z in state.zones if not z.is_quarantined)
    ph_drift = 0.01 * active_zones * (dt_hours / 6.0)
    state.resources.nutrient_solution_ph = min(
        7.5, state.resources.nutrient_solution_ph + ph_drift
    )

    # EC decreases as nutrients are consumed
    ec_consumption = 0.005 * active_zones * (dt_hours / 6.0)
    state.resources.nutrient_solution_ec = max(
        0.5, state.resources.nutrient_solution_ec - ec_consumption
    )
