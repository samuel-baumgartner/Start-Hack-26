"""Nutritional coverage calculation and scipy-based crop allocation optimizer."""

from __future__ import annotations

from typing import Any

import numpy as np
from scipy.optimize import linprog

from config import (
    CREW_SIZE,
    DAILY_CALCIUM_MG,
    DAILY_CALORIES_KCAL,
    DAILY_FAT_G,
    DAILY_FIBER_G,
    DAILY_FOLATE_UG,
    DAILY_IRON_MG,
    DAILY_POTASSIUM_MG,
    DAILY_PROTEIN_G,
    DAILY_VITAMIN_A_UG_RAE,
    DAILY_VITAMIN_C_MG,
    DAILY_VITAMIN_K_UG,
    GROWING_AREA_M2,
    GREENHOUSE_POWER_BUDGET_KW,
    GREENHOUSE_WATER_BUDGET_L,
)
from simulation.crops import CROP_DATABASE
from simulation.state import GreenhouseState

# Daily requirements for the whole crew
DAILY_REQUIREMENTS = {
    "calories_kcal": DAILY_CALORIES_KCAL * CREW_SIZE,
    "vitamin_c_mg": DAILY_VITAMIN_C_MG * CREW_SIZE,
    "vitamin_k_ug": DAILY_VITAMIN_K_UG * CREW_SIZE,
    "folate_ug": DAILY_FOLATE_UG * CREW_SIZE,
    "iron_mg": DAILY_IRON_MG * CREW_SIZE,
    "calcium_mg": DAILY_CALCIUM_MG * CREW_SIZE,
    "protein_g": DAILY_PROTEIN_G * CREW_SIZE,
    "fat_g": DAILY_FAT_G * CREW_SIZE,
    "fiber_g": DAILY_FIBER_G * CREW_SIZE,
    "potassium_mg": DAILY_POTASSIUM_MG * CREW_SIZE,
    "vitamin_a_ug_rae": DAILY_VITAMIN_A_UG_RAE * CREW_SIZE,
}


def compute_nutrition_coverage(state: GreenhouseState) -> dict[str, Any]:
    """Compute current nutritional coverage as % of daily requirement.

    Based on projected daily yield from current crops at current health.
    """
    daily_nutrients: dict[str, float] = {k: 0.0 for k in DAILY_REQUIREMENTS}

    for zone in state.zones:
        if zone.is_quarantined:
            continue
        for crop in zone.crops:
            if crop.health <= 0 or crop.growth_stage.value == "harvested":
                continue

            crop_data = CROP_DATABASE.get(crop.crop_name, {})
            nutrition = crop_data.get("nutrition_per_100g", {})

            # Estimated daily yield from this crop (g/day)
            area_per_crop = zone.area_m2 / max(len(zone.crops), 1)
            daily_yield_g = crop.yield_per_m2_per_day * area_per_crop * (crop.health / 100.0)

            # Convert to nutrient amounts
            for nutrient, value_per_100g in nutrition.items():
                if nutrient in daily_nutrients:
                    daily_nutrients[nutrient] += value_per_100g * (daily_yield_g / 100.0)

    # Compute coverage percentages
    coverage = {}
    for nutrient, daily_amount in daily_nutrients.items():
        requirement = DAILY_REQUIREMENTS.get(nutrient, 1)
        pct = (daily_amount / requirement) * 100.0 if requirement > 0 else 0
        coverage[nutrient] = {
            "daily_production": round(daily_amount, 2),
            "daily_requirement": requirement,
            "coverage_percent": round(pct, 1),
        }

    # Overall score: minimum coverage across all nutrients (the bottleneck)
    min_coverage = min(c["coverage_percent"] for c in coverage.values()) if coverage else 0
    coverage["overall_min_coverage_percent"] = round(min_coverage, 1)

    return coverage


def optimize_crop_allocation(
    available_area_m2: float | None = None,
    water_budget_l_per_day: float | None = None,
    power_budget_kw: float | None = None,
) -> dict[str, Any]:
    """Optimize crop area allocation to maximize minimum nutritional coverage.

    Uses scipy linprog with minimax formulation:
    - Maximize z (the minimum coverage ratio across nutrients)
    - Subject to: for each nutrient j, sum_i(n_ij * y_i * x_i) / R_j >= z
    - Area, water, power constraints
    """
    area = available_area_m2 if available_area_m2 is not None else GROWING_AREA_M2
    water = water_budget_l_per_day if water_budget_l_per_day is not None else (GREENHOUSE_WATER_BUDGET_L * 0.1)
    power = power_budget_kw if power_budget_kw is not None else GREENHOUSE_POWER_BUDGET_KW

    crop_names = list(CROP_DATABASE.keys())
    n_crops = len(crop_names)
    n_nutrients = len(DAILY_REQUIREMENTS)
    nutrient_names = list(DAILY_REQUIREMENTS.keys())

    # Decision variables: [x_1, ..., x_n, z]
    # where x_i = area for crop i, z = minimum coverage ratio
    n_vars = n_crops + 1

    # Objective: maximize z (minimize -z)
    c = np.zeros(n_vars)
    c[-1] = -1.0  # maximize z

    # Inequality constraints: A_ub @ x <= b_ub
    A_ub = []
    b_ub = []

    # For each nutrient j: -sum_i(n_ij * y_i * x_i) / R_j + z <= 0
    # i.e., z <= coverage_j for all j
    for j, nutrient in enumerate(nutrient_names):
        row = np.zeros(n_vars)
        req = DAILY_REQUIREMENTS[nutrient]
        for i, crop_name in enumerate(crop_names):
            crop_data = CROP_DATABASE[crop_name]
            yield_per_m2 = crop_data["yield_per_m2_per_day"]
            nutrient_per_100g = crop_data["nutrition_per_100g"].get(nutrient, 0)
            # Nutrient production = yield_g/m²/day * area * nutrient/100g
            production_per_m2 = yield_per_m2 * nutrient_per_100g / 100.0
            row[i] = -production_per_m2 / req  # negative because constraint is <=
        row[-1] = 1.0  # z
        A_ub.append(row)
        b_ub.append(0.0)

    # Area constraint: sum(x_i) <= area
    area_row = np.zeros(n_vars)
    area_row[:n_crops] = 1.0
    A_ub.append(area_row)
    b_ub.append(area)

    # Water constraint: sum(w_i * x_i) <= water
    water_row = np.zeros(n_vars)
    for i, crop_name in enumerate(crop_names):
        water_row[i] = CROP_DATABASE[crop_name]["water_use_l_per_m2_per_day"]
    A_ub.append(water_row)
    b_ub.append(water)

    # Power constraint: sum(p_i * x_i) <= power
    power_row = np.zeros(n_vars)
    for i, crop_name in enumerate(crop_names):
        power_row[i] = CROP_DATABASE[crop_name]["power_per_m2_kw"]
    A_ub.append(power_row)
    b_ub.append(power)

    A_ub = np.array(A_ub)
    b_ub = np.array(b_ub)

    # Bounds: x_i >= 0, z >= 0
    bounds = [(0, area) for _ in range(n_crops)] + [(0, None)]

    result = linprog(c, A_ub=A_ub, b_ub=b_ub, bounds=bounds, method="highs")

    if not result.success:
        return {"status": "error", "message": f"Optimization failed: {result.message}"}

    allocation = {}
    total_water = 0.0
    total_power = 0.0
    for i, crop_name in enumerate(crop_names):
        area_allocated = round(result.x[i], 2)
        if area_allocated > 0.01:
            crop_data = CROP_DATABASE[crop_name]
            water_use = crop_data["water_use_l_per_m2_per_day"] * area_allocated
            power_use = crop_data["power_per_m2_kw"] * area_allocated
            total_water += water_use
            total_power += power_use
            allocation[crop_name] = {
                "area_m2": area_allocated,
                "daily_yield_g": round(crop_data["yield_per_m2_per_day"] * area_allocated, 1),
                "water_l_per_day": round(water_use, 2),
                "power_kw": round(power_use, 2),
            }

    min_coverage = round(result.x[-1] * 100, 1)  # convert ratio to percentage

    return {
        "status": "ok",
        "min_coverage_percent": min_coverage,
        "total_area_used_m2": round(sum(a["area_m2"] for a in allocation.values()), 2),
        "total_water_l_per_day": round(total_water, 2),
        "total_power_kw": round(total_power, 2),
        "allocation": allocation,
    }
