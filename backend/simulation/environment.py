"""Mars environment simulation: solar irradiance, temperature drift, CO2/humidity dynamics."""

from __future__ import annotations

import math

from config import (
    GREENHOUSE_CO2_TARGET,
    GREENHOUSE_HUMIDITY_TARGET,
    GREENHOUSE_TEMP_TARGET,
    MARS_SOL_LENGTH_HOURS,
    MARS_SOLAR_IRRADIANCE_MAX,
    MARS_SURFACE_TEMP_AVG,
    SIMULATION_TICK_HOURS,
)


def compute_sol_and_time(total_ticks: int) -> tuple[int, int, float, bool]:
    """Return (sol, tick_in_sol, hour_of_sol, is_daytime) from total ticks."""
    hours_elapsed = total_ticks * SIMULATION_TICK_HOURS
    sol = int(hours_elapsed / MARS_SOL_LENGTH_HOURS) + 1
    hour_of_sol = hours_elapsed % MARS_SOL_LENGTH_HOURS
    tick_in_sol = int(hour_of_sol / SIMULATION_TICK_HOURS)
    # Daytime roughly 6am - 6pm Mars time (first ~12 hours of sol)
    is_daytime = 3.0 < hour_of_sol < 21.0
    return sol, tick_in_sol, hour_of_sol, is_daytime


def compute_solar_irradiance(hour_of_sol: float, dust_opacity_tau: float) -> float:
    """Sinusoidal solar irradiance reduced by atmospheric dust.

    Peak at solar noon (~12h), zero at night.
    Dust attenuates via Beer-Lambert: I = I0 * exp(-tau)
    """
    # Sinusoidal curve: peak at hour 12, zero before 6 and after 18
    if hour_of_sol < 5.0 or hour_of_sol > 19.5:
        return 0.0

    phase = math.pi * (hour_of_sol - 5.0) / 14.5
    raw = MARS_SOLAR_IRRADIANCE_MAX * max(0.0, math.sin(phase))

    # Dust attenuation (Beer-Lambert law) — clamp tau >= 0
    attenuation = math.exp(-max(0.0, dust_opacity_tau))
    return raw * attenuation


def compute_external_temperature(hour_of_sol: float) -> float:
    """Sinusoidal external temperature: peaks in afternoon, coldest pre-dawn."""
    # Range: avg ± 30°C
    amplitude = 30.0
    # Peak at hour 14 (2pm), minimum at hour 4 (4am)
    phase = 2.0 * math.pi * (hour_of_sol - 14.0) / MARS_SOL_LENGTH_HOURS
    return MARS_SURFACE_TEMP_AVG + amplitude * math.cos(phase)


def update_greenhouse_temperature(
    current_temp: float,
    external_temp: float,
    heating_power_kw: float,
    dt_hours: float,
    target_temp: float = GREENHOUSE_TEMP_TARGET,
) -> float:
    """Greenhouse temp drifts toward external, countered by heating.

    Simple model: temp moves toward external at ~0.5°C/hour,
    heating adds ~1°C per kW per hour (capped by target).
    """
    # Drift toward external
    drift_rate = 0.5  # °C per hour
    drift = drift_rate * dt_hours * (external_temp - current_temp) / max(abs(external_temp - current_temp), 1.0)

    # Heating effect (proportional to power)
    heating_effect = 0.0
    if current_temp < target_temp:
        heating_effect = min(heating_power_kw * 0.8 * dt_hours, target_temp - current_temp)

    new_temp = current_temp + drift + heating_effect

    # Clamp to reasonable range
    return max(5.0, min(40.0, new_temp))


def update_humidity(
    current_humidity: float,
    num_zones_irrigating: int,
    dt_hours: float,
) -> float:
    """Humidity increases with irrigation, decays toward target via dehumidification."""
    # Irrigation adds humidity
    irrigation_effect = num_zones_irrigating * 0.5 * dt_hours

    # Dehumidification pulls toward target
    correction = 0.3 * dt_hours * (GREENHOUSE_HUMIDITY_TARGET - current_humidity)

    new_humidity = current_humidity + irrigation_effect + correction
    return max(30.0, min(95.0, new_humidity))


def update_co2(
    current_co2: float,
    num_active_crop_zones: int,
    is_daytime: bool,
    dt_hours: float,
) -> float:
    """CO2 consumed by photosynthesis during day, produced by respiration at night.

    Mars atmosphere provides free CO2 via intake valve (auto-maintains target).
    """
    if is_daytime:
        # Plants consume CO2 during photosynthesis
        consumption = num_active_crop_zones * 15.0 * dt_hours
        # Auto-intake from Mars atmosphere
        intake = 0.5 * dt_hours * (GREENHOUSE_CO2_TARGET - current_co2 + consumption)
        new_co2 = current_co2 - consumption + max(0, intake)
    else:
        # Plants produce CO2 at night via respiration (small amount)
        production = num_active_crop_zones * 3.0 * dt_hours
        # Slight correction toward target
        correction = 0.2 * dt_hours * (GREENHOUSE_CO2_TARGET - current_co2)
        new_co2 = current_co2 + production + correction

    return max(300.0, min(2500.0, new_co2))
