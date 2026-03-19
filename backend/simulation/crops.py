"""Crop database and growth functions.

Growth follows a logistic curve modified by environmental stress multipliers.
Nutritional profiles are per 100g edible weight (USDA approximate values).
"""

from __future__ import annotations

import math

CROP_DATABASE: dict[str, dict] = {
    "lettuce": {
        "days_to_harvest": 35,
        "overripe_grace_days": 10,
        "yield_per_m2_per_day": 20.0,  # g/m²/day at peak
        "water_use_l_per_m2_per_day": 0.4,
        "optimal_temp_min": 18,
        "optimal_temp_max": 24,
        "optimal_par": 200,  # µmol/m²/s — Syngenta: 150-250 for leafy greens
        "optimal_ph_min": 5.5,
        "optimal_ph_max": 6.5,
        "power_per_m2_kw": 0.15,
        "nutrition_per_100g": {
            "calories_kcal": 17,
            "protein_g": 1.2,
            "fat_g": 0.3,
            "fiber_g": 2.1,
            "vitamin_c_mg": 24,
            "vitamin_k_ug": 126,
            "folate_ug": 136,
            "calcium_mg": 33,
            "iron_mg": 0.9,
            "potassium_mg": 247,
            "vitamin_a_ug_rae": 436,
        },
    },
    "kale": {
        "days_to_harvest": 55,
        "overripe_grace_days": 10,
        "yield_per_m2_per_day": 15.0,
        "water_use_l_per_m2_per_day": 0.5,
        "optimal_temp_min": 15,
        "optimal_temp_max": 22,
        "optimal_par": 250,  # Syngenta-aligned
        "optimal_ph_min": 6.0,
        "optimal_ph_max": 7.0,
        "power_per_m2_kw": 0.18,
        "nutrition_per_100g": {
            "calories_kcal": 49,
            "protein_g": 4.3,
            "fat_g": 0.9,
            "fiber_g": 3.6,
            "vitamin_c_mg": 120,
            "vitamin_k_ug": 817,
            "folate_ug": 141,
            "calcium_mg": 150,
            "iron_mg": 1.5,
            "potassium_mg": 491,
            "vitamin_a_ug_rae": 500,
        },
    },
    "spinach": {
        "days_to_harvest": 40,
        "overripe_grace_days": 10,
        "yield_per_m2_per_day": 18.0,
        "water_use_l_per_m2_per_day": 0.4,
        "optimal_temp_min": 16,
        "optimal_temp_max": 22,
        "optimal_par": 200,  # Syngenta-aligned
        "optimal_ph_min": 6.0,
        "optimal_ph_max": 7.0,
        "power_per_m2_kw": 0.15,
        "nutrition_per_100g": {
            "calories_kcal": 23,
            "protein_g": 2.9,
            "fat_g": 0.4,
            "fiber_g": 2.2,
            "vitamin_c_mg": 28,
            "vitamin_k_ug": 483,
            "folate_ug": 194,
            "calcium_mg": 99,
            "iron_mg": 2.7,
            "potassium_mg": 558,
            "vitamin_a_ug_rae": 469,
        },
    },
    "basil": {
        "days_to_harvest": 25,
        "overripe_grace_days": 7,
        "yield_per_m2_per_day": 12.0,
        "water_use_l_per_m2_per_day": 0.3,
        "optimal_temp_min": 20,
        "optimal_temp_max": 28,
        "optimal_par": 250,  # Syngenta-aligned
        "optimal_ph_min": 5.5,
        "optimal_ph_max": 6.5,
        "power_per_m2_kw": 0.15,
        "nutrition_per_100g": {
            "calories_kcal": 23,
            "protein_g": 3.2,
            "fat_g": 0.6,
            "fiber_g": 1.6,
            "vitamin_c_mg": 18,
            "vitamin_k_ug": 415,
            "folate_ug": 68,
            "calcium_mg": 177,
            "iron_mg": 3.2,
            "potassium_mg": 295,
            "vitamin_a_ug_rae": 264,
        },
    },
    "tomato": {
        "days_to_harvest": 70,
        "overripe_grace_days": 14,
        "yield_per_m2_per_day": 25.0,
        "water_use_l_per_m2_per_day": 0.7,
        "optimal_temp_min": 20,
        "optimal_temp_max": 26,
        "optimal_par": 450,
        "optimal_ph_min": 5.5,
        "optimal_ph_max": 6.5,
        "power_per_m2_kw": 0.20,
        "nutrition_per_100g": {
            "calories_kcal": 18,
            "protein_g": 0.9,
            "fat_g": 0.2,
            "fiber_g": 1.2,
            "vitamin_c_mg": 14,
            "vitamin_k_ug": 7.9,
            "folate_ug": 15,
            "calcium_mg": 10,
            "iron_mg": 0.3,
            "potassium_mg": 237,
            "vitamin_a_ug_rae": 42,
        },
    },
    "pepper": {
        "days_to_harvest": 80,
        "overripe_grace_days": 14,
        "yield_per_m2_per_day": 20.0,
        "water_use_l_per_m2_per_day": 0.6,
        "optimal_temp_min": 21,
        "optimal_temp_max": 27,
        "optimal_par": 450,
        "optimal_ph_min": 5.5,
        "optimal_ph_max": 6.5,
        "power_per_m2_kw": 0.20,
        "nutrition_per_100g": {
            "calories_kcal": 31,
            "protein_g": 1.0,
            "fat_g": 0.3,
            "fiber_g": 2.1,
            "vitamin_c_mg": 128,
            "vitamin_k_ug": 4.9,
            "folate_ug": 46,
            "calcium_mg": 7,
            "iron_mg": 0.4,
            "potassium_mg": 211,
            "vitamin_a_ug_rae": 157,
        },
    },
    "radish": {
        "days_to_harvest": 28,
        "overripe_grace_days": 5,
        "yield_per_m2_per_day": 22.0,
        "water_use_l_per_m2_per_day": 0.3,
        "optimal_temp_min": 15,
        "optimal_temp_max": 22,
        "optimal_par": 250,
        "optimal_ph_min": 6.0,
        "optimal_ph_max": 7.0,
        "power_per_m2_kw": 0.12,
        "nutrition_per_100g": {
            "calories_kcal": 16,
            "protein_g": 0.7,
            "fat_g": 0.1,
            "fiber_g": 1.6,
            "vitamin_c_mg": 15,
            "vitamin_k_ug": 1.3,
            "folate_ug": 25,
            "calcium_mg": 25,
            "iron_mg": 0.3,
            "potassium_mg": 233,
            "vitamin_a_ug_rae": 0,
        },
    },
    "soybean": {
        "days_to_harvest": 93,  # NASA BPC measured
        "overripe_grace_days": 30,
        "yield_per_m2_per_day": 14.0,  # optimized CEA w/ 18h photoperiod
        "water_use_l_per_m2_per_day": 0.6,
        "optimal_temp_min": 20,
        "optimal_temp_max": 28,
        "optimal_par": 400,
        "optimal_ph_min": 5.8,
        "optimal_ph_max": 6.5,
        "power_per_m2_kw": 0.18,
        "nutrition_per_100g": {
            "calories_kcal": 147,
            "protein_g": 12.9,
            "fat_g": 6.8,
            "fiber_g": 4.2,
            "vitamin_c_mg": 6,
            "vitamin_k_ug": 33,
            "folate_ug": 165,
            "calcium_mg": 145,
            "iron_mg": 3.5,
            "potassium_mg": 539,
            "vitamin_a_ug_rae": 9,
        },
    },
    "microgreens": {
        "days_to_harvest": 10,
        "overripe_grace_days": 5,
        "yield_per_m2_per_day": 30.0,
        "water_use_l_per_m2_per_day": 0.3,
        "optimal_temp_min": 18,
        "optimal_temp_max": 24,
        "optimal_par": 250,
        "optimal_ph_min": 5.5,
        "optimal_ph_max": 6.5,
        "power_per_m2_kw": 0.12,
        "nutrition_per_100g": {
            "calories_kcal": 31,
            "protein_g": 3.0,
            "fat_g": 0.5,
            "fiber_g": 2.5,
            "vitamin_c_mg": 60,
            "vitamin_k_ug": 300,
            "folate_ug": 80,
            "calcium_mg": 50,
            "iron_mg": 2.0,
            "potassium_mg": 350,
            "vitamin_a_ug_rae": 200,
        },
    },
    "potato": {
        "days_to_harvest": 95,
        "overripe_grace_days": 45,
        "yield_per_m2_per_day": 130.0,  # optimized CEA tuber yield
        "water_use_l_per_m2_per_day": 0.6,
        "optimal_temp_min": 16,
        "optimal_temp_max": 20,
        "optimal_par": 500,
        "optimal_ph_min": 5.0,
        "optimal_ph_max": 6.0,
        "power_per_m2_kw": 0.20,
        "nutrition_per_100g": {
            "calories_kcal": 87,
            "protein_g": 1.9,
            "fat_g": 0.1,
            "fiber_g": 1.8,
            "vitamin_c_mg": 13,
            "vitamin_k_ug": 2.0,
            "folate_ug": 18,
            "calcium_mg": 9,
            "iron_mg": 0.5,
            "potassium_mg": 379,
            "vitamin_a_ug_rae": 0,
        },
    },
    "sweet_potato": {
        "days_to_harvest": 110,
        "overripe_grace_days": 45,
        "yield_per_m2_per_day": 120.0,  # optimized CEA w/ 24h tuber lighting
        "water_use_l_per_m2_per_day": 0.5,
        "optimal_temp_min": 24,
        "optimal_temp_max": 30,
        "optimal_par": 500,
        "optimal_ph_min": 5.5,
        "optimal_ph_max": 6.5,
        "power_per_m2_kw": 0.20,
        "nutrition_per_100g": {
            "calories_kcal": 90,
            "protein_g": 2.0,
            "fat_g": 0.1,
            "fiber_g": 3.0,
            "vitamin_c_mg": 19,
            "vitamin_k_ug": 1.8,
            "folate_ug": 6,
            "calcium_mg": 38,
            "iron_mg": 0.7,
            "potassium_mg": 475,
            "vitamin_a_ug_rae": 709,
        },
    },
    "wheat": {
        "days_to_harvest": 75,
        "overripe_grace_days": 60,
        "yield_per_m2_per_day": 28.0,  # optimized CEA grain yield
        "water_use_l_per_m2_per_day": 0.4,
        "optimal_temp_min": 18,
        "optimal_temp_max": 24,
        "optimal_par": 600,
        "optimal_ph_min": 6.0,
        "optimal_ph_max": 7.0,
        "power_per_m2_kw": 0.22,
        "nutrition_per_100g": {
            "calories_kcal": 340,
            "protein_g": 13.2,
            "fat_g": 2.5,
            "fiber_g": 10.7,
            "vitamin_c_mg": 0,
            "vitamin_k_ug": 1.9,
            "folate_ug": 43,
            "calcium_mg": 29,
            "iron_mg": 3.2,
            "potassium_mg": 363,
            "vitamin_a_ug_rae": 0,
        },
    },
    "dry_beans": {
        "days_to_harvest": 60,
        "overripe_grace_days": 30,
        "yield_per_m2_per_day": 22.0,  # optimized CEA legume yield
        "water_use_l_per_m2_per_day": 0.5,
        "optimal_temp_min": 18,
        "optimal_temp_max": 25,
        "optimal_par": 400,
        "optimal_ph_min": 6.0,
        "optimal_ph_max": 7.0,
        "power_per_m2_kw": 0.16,
        "nutrition_per_100g": {
            "calories_kcal": 141,
            "protein_g": 9.7,
            "fat_g": 0.5,
            "fiber_g": 7.4,
            "vitamin_c_mg": 1,
            "vitamin_k_ug": 5.6,
            "folate_ug": 130,
            "calcium_mg": 46,
            "iron_mg": 2.9,
            "potassium_mg": 403,
            "vitamin_a_ug_rae": 0,
        },
    },
    "dwarf_wheat": {
        "days_to_harvest": 68,  # Apogee cultivar, USU/NASA BPC
        "overripe_grace_days": 60,
        "yield_per_m2_per_day": 25.0,  # optimized CEA w/ 1000ppm CO2, 18h light
        "water_use_l_per_m2_per_day": 0.4,
        "optimal_temp_min": 18,
        "optimal_temp_max": 24,
        "optimal_par": 500,  # Apogee cultivar optimal
        "optimal_ph_min": 6.0,
        "optimal_ph_max": 7.0,
        "power_per_m2_kw": 0.20,
        "nutrition_per_100g": {
            "calories_kcal": 340,
            "protein_g": 13.2,
            "fat_g": 2.5,
            "fiber_g": 10.7,
            "vitamin_c_mg": 0,
            "vitamin_k_ug": 1.9,
            "folate_ug": 43,
            "calcium_mg": 29,
            "iron_mg": 3.2,
            "potassium_mg": 363,
            "vitamin_a_ug_rae": 0,
        },
    },
    "cherry_tomato": {
        "days_to_harvest": 65,  # Red Robin cultivar, NASA VEG-05
        "overripe_grace_days": 10,
        "yield_per_m2_per_day": 12.0,
        "water_use_l_per_m2_per_day": 0.5,
        "optimal_temp_min": 20,
        "optimal_temp_max": 26,
        "optimal_par": 400,
        "optimal_ph_min": 5.5,
        "optimal_ph_max": 6.5,
        "power_per_m2_kw": 0.18,
        "nutrition_per_100g": {
            "calories_kcal": 18,
            "protein_g": 0.9,
            "fat_g": 0.2,
            "fiber_g": 1.2,
            "vitamin_c_mg": 14,
            "vitamin_k_ug": 7.9,
            "folate_ug": 15,
            "calcium_mg": 10,
            "iron_mg": 0.3,
            "potassium_mg": 237,
            "vitamin_a_ug_rae": 42,
        },
    },
}


def logistic_growth(t: float, k: float, t_half: float, steepness: float = 0.15) -> float:
    """Logistic growth curve returning fraction of max biomass (0-1).

    t: days since planting
    k: max biomass capacity (=1 normalized)
    t_half: days to reach 50% of max
    steepness: growth rate parameter
    """
    return k / (1.0 + math.exp(-steepness * (t - t_half)))


def compute_stress_multiplier(
    temp: float,
    par: float,
    water_available: bool,
    health: float,
    crop_data: dict,
) -> float:
    """Compute combined stress multiplier (0.0-1.0) from environmental factors."""
    # Temperature stress
    t_min = crop_data.get("optimal_temp_min", 18)
    t_max = crop_data.get("optimal_temp_max", 26)
    if t_min <= temp <= t_max:
        temp_factor = 1.0
    elif temp < t_min:
        temp_factor = max(0.0, 1.0 - 0.1 * (t_min - temp))
    else:
        temp_factor = max(0.0, 1.0 - 0.1 * (temp - t_max))

    # Light stress
    optimal_par = crop_data.get("optimal_par", 400)
    if par >= optimal_par * 0.8:
        light_factor = 1.0
    else:
        light_factor = max(0.1, par / (optimal_par * 0.8))

    # Water stress — binary for simplicity
    water_factor = 1.0 if water_available else 0.3

    # Health factor
    health_factor = health / 100.0

    return temp_factor * light_factor * water_factor * health_factor


def compute_growth_increment(
    crop: "CropStatus",
    crop_data: dict,
    zone: "Zone",
    water_available: bool,
    dt_hours: float,
) -> float:
    """Compute biomass increment (grams) for a time step.

    Uses logistic growth modulated by stress multipliers.
    """
    dt_days = dt_hours / 24.0
    days_to_harvest = crop_data.get("days_to_harvest", 30)
    peak_yield = crop_data.get("yield_per_m2_per_day", 15.0)

    # Logistic growth fraction at current time
    current_frac = logistic_growth(crop.days_planted, 1.0, days_to_harvest * 0.5)
    next_frac = logistic_growth(crop.days_planted + dt_days, 1.0, days_to_harvest * 0.5)
    growth_rate_frac = next_frac - current_frac

    stress = compute_stress_multiplier(
        temp=zone.temperature,
        par=zone.par_level if zone.lighting_on else 0.0,
        water_available=water_available,
        health=crop.health,
        crop_data=crop_data,
    )

    # Biomass increment = peak_yield * zone_area * growth_rate * stress
    area_per_crop = zone.area_m2 / max(len(zone.crops), 1)
    increment = peak_yield * area_per_crop * growth_rate_frac * days_to_harvest * stress

    return max(0.0, increment)
