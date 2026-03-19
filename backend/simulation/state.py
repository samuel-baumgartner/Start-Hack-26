from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from config import (
    BATTERY_CAPACITY_KWH,
    BATTERY_INITIAL_CHARGE,
    GREENHOUSE_CO2_TARGET,
    GREENHOUSE_HUMIDITY_TARGET,
    GREENHOUSE_PAR_TARGET,
    GREENHOUSE_PHOTOPERIOD_HOURS,
    GREENHOUSE_PRESSURE,
    GREENHOUSE_TEMP_TARGET,
    GREENHOUSE_WATER_BUDGET_L,
    GREENHOUSE_WATER_RECYCLE_EFFICIENCY,
    NUM_ZONES,
    ZONE_AREA_M2,
)


class DiseaseState(BaseModel):
    disease_type: str  # "pythium_root_rot" | "powdery_mildew" | "bacterial_wilt"
    zone_id: str
    stage: str = "incubating"  # "incubating" | "symptomatic" | "critical"
    severity: float = 0.0  # 0–100
    ticks_in_stage: int = 0
    water_contamination: float = 0.0  # 0–1, pathogen load in shared water
    treated_uvc: bool = False
    treated_h2o2: bool = False


class GrowthStage(str, Enum):
    SEEDLING = "seedling"
    VEGETATIVE = "vegetative"
    FLOWERING = "flowering"
    FRUITING = "fruiting"
    MATURE = "mature"
    HARVESTED = "harvested"


class CropStatus(BaseModel):
    crop_name: str
    growth_stage: GrowthStage = GrowthStage.SEEDLING
    days_planted: float = 0.0
    health: float = 100.0  # 0-100
    biomass_g: float = 0.0
    days_to_harvest: float = 30.0
    yield_per_m2_per_day: float = 0.0  # g/m²/day at peak
    water_use_l_per_m2_per_day: float = 0.5


class Zone(BaseModel):
    zone_id: str
    area_m2: float = ZONE_AREA_M2
    crops: list[CropStatus] = Field(default_factory=list)
    temperature: float = GREENHOUSE_TEMP_TARGET
    humidity: float = GREENHOUSE_HUMIDITY_TARGET
    co2_ppm: float = GREENHOUSE_CO2_TARGET
    par_level: float = GREENHOUSE_PAR_TARGET
    par_setpoint: float = GREENHOUSE_PAR_TARGET
    temperature_setpoint: float = GREENHOUSE_TEMP_TARGET
    photoperiod_hours: float = GREENHOUSE_PHOTOPERIOD_HOURS
    irrigation_rate_l_per_hour: float = 0.5
    humidity_setpoint: float = GREENHOUSE_HUMIDITY_TARGET
    substrate: str = "hydro"  # "soil" or "hydro"
    lighting_on: bool = True
    is_quarantined: bool = False
    priority: str = "normal"  # normal, high, low, hibernate, sacrifice


class ResourceState(BaseModel):
    water_reservoir_l: float = GREENHOUSE_WATER_BUDGET_L
    water_recycling_efficiency: float = GREENHOUSE_WATER_RECYCLE_EFFICIENCY
    water_consumed_today_l: float = 0.0
    nutrient_solution_ph: float = 6.0
    nutrient_solution_ec: float = 2.0  # mS/cm
    power_generation_kw: float = 15.0
    power_consumption_kw: float = 12.0
    battery_charge_kwh: float = BATTERY_CAPACITY_KWH * BATTERY_INITIAL_CHARGE
    battery_capacity_kwh: float = BATTERY_CAPACITY_KWH
    solar_panel_efficiency: float = 1.0  # reduced by dust


class EnvironmentState(BaseModel):
    sol: int = 1
    tick: int = 0  # ticks within the current sol
    total_ticks: int = 0
    is_daytime: bool = True
    external_temp_c: float = -60.0
    solar_irradiance_w_m2: float = 590.0
    dust_opacity_tau: float = 0.5  # normal 0.3-1.0, storm 2-5+
    pressure_kpa: float = GREENHOUSE_PRESSURE
    o2_percent: float = 21.0
    dust_storm_active: bool = False
    dust_storm_remaining_sols: int = 0
    disease_active: bool = False
    disease_zone_id: Optional[str] = None
    power_failure_active: bool = False
    power_failure_reduction: float = 0.0  # fraction of power lost


class EventLogEntry(BaseModel):
    sol: int
    tick: int
    event_type: str
    description: str
    affected_zones: list[str] = Field(default_factory=list)
    params: dict = Field(default_factory=dict)


class GreenhouseState(BaseModel):
    zones: list[Zone] = Field(default_factory=list)
    resources: ResourceState = Field(default_factory=ResourceState)
    environment: EnvironmentState = Field(default_factory=EnvironmentState)
    event_log: list[EventLogEntry] = Field(default_factory=list)
    agent_decisions: list[dict] = Field(default_factory=list)
    diseases: list[DiseaseState] = Field(default_factory=list)
    crew_health: float = 100.0  # 0-100, mission-level crew health


def create_default_state() -> GreenhouseState:
    """Create the initial greenhouse state with 4 variable-size zones (NASA ALS ratios)."""
    # (zone_id, area_m2, substrate, crop_names)
    zone_configs = [
        ("A", 80.0,  "soil",  ["dwarf_wheat", "sweet_potato"]),     # 40% — Caloric base
        ("B", 50.0,  "hydro", ["soybean"]),                          # 25% — Protein & fats
        ("C", 45.0,  "hydro", ["kale", "spinach", "cherry_tomato"]), # 22.5% — Micronutrients
        ("D", 25.0,  "hydro", ["radish", "microgreens"]),            # 12.5% — Rapid response
    ]

    from simulation.crops import CROP_DATABASE

    zones = []
    for zone_id, area, substrate, crop_names in zone_configs:
        crops = []
        for name in crop_names:
            db_entry = CROP_DATABASE.get(name, {})
            crops.append(
                CropStatus(
                    crop_name=name,
                    days_to_harvest=db_entry.get("days_to_harvest", 30),
                    yield_per_m2_per_day=db_entry.get("yield_per_m2_per_day", 15.0),
                    water_use_l_per_m2_per_day=db_entry.get(
                        "water_use_l_per_m2_per_day", 0.5
                    ),
                )
            )
        zone = Zone(
            zone_id=zone_id,
            area_m2=area,
            substrate=substrate,
            crops=crops,
        )
        # Zone A runs warmer for sweet potato
        if zone_id == "A":
            zone.temperature_setpoint = 27.0
        zones.append(zone)

    return GreenhouseState(zones=zones)
