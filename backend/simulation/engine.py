"""SimulationEngine: tick(), apply_command(), trigger_event()."""

from __future__ import annotations

import random

from simulation.crops import CROP_DATABASE, compute_growth_increment
from simulation.environment import (
    compute_external_temperature,
    compute_sol_and_time,
    compute_solar_irradiance,
    update_co2,
    update_greenhouse_temperature,
    update_humidity,
)
from simulation.resources import update_nutrient_solution, update_power, update_water
from simulation.sensors import reset_sensor_state, tick_sensor_failures
from simulation.state import (
    CropStatus,
    DiseaseState,
    EventLogEntry,
    GrowthStage,
    GreenhouseState,
    create_default_state,
)
from config import (
    BROWNOUT_HYSTERESIS,
    BROWNOUT_TIER1_PERCENT,
    BROWNOUT_TIER2_PERCENT,
    BROWNOUT_TIER3_PERCENT,
    CREW_HEALTH_DECAY_PER_TICK,
    CREW_HEALTH_RECOVERY_PER_TICK,
    DISEASE_DAMAGE_CRITICAL,
    DISEASE_DAMAGE_SYMPTOMATIC,
    DISEASE_INCUBATION_TICKS,
    DISEASE_PROBABILITY_PER_SOL,
    DISEASE_SPREAD_CHANCE_PER_TICK,
    DISEASE_SPREAD_THRESHOLD,
    DISEASE_WATER_SPREAD_RATE,
    DUST_STORM_PROBABILITY_PER_SOL,
    H2O2_EC_INCREASE,
    POWER_FAILURE_PROBABILITY_PER_SOL,
    POWER_HEATING_KW,
    SIMULATION_TICK_HOURS,
    UVC_POWER_COST_KW,
)
from simulation.nutrition import compute_nutrition_coverage


class SimulationEngine:
    def __init__(self) -> None:
        self.state = create_default_state()

    def reset(self) -> GreenhouseState:
        """Reset simulation to initial state."""
        self.state = create_default_state()
        reset_sensor_state()
        return self.state

    def tick(self, n: int = 1) -> GreenhouseState:
        """Advance simulation by n ticks (each tick = SIMULATION_TICK_HOURS)."""
        for _ in range(n):
            self._tick_once()
        return self.state

    def _tick_once(self) -> None:
        env = self.state.environment
        env.total_ticks += 1
        dt = SIMULATION_TICK_HOURS

        # Update time
        sol, tick_in_sol, hour_of_sol, is_daytime = compute_sol_and_time(env.total_ticks)
        env.sol = sol
        env.tick = tick_in_sol
        env.is_daytime = is_daytime

        # Update Mars environment
        env.external_temp_c = compute_external_temperature(hour_of_sol)
        env.solar_irradiance_w_m2 = compute_solar_irradiance(
            hour_of_sol, env.dust_opacity_tau
        )

        # Dust storm progression
        if env.dust_storm_active:
            # Check if storm ends (decrement happens per sol, roughly every 4 ticks)
            if tick_in_sol == 0:
                env.dust_storm_remaining_sols -= 1
                if env.dust_storm_remaining_sols <= 0:
                    env.dust_storm_active = False
                    env.dust_opacity_tau = 0.5  # return to normal
                    self._log_event("dust_storm_end", "Dust storm has ended")

        # Power failure recovery check
        if env.power_failure_active and tick_in_sol == 0:
            # Power gradually recovers over time (simplified)
            env.power_failure_reduction = max(0.0, env.power_failure_reduction - 0.05)
            if env.power_failure_reduction <= 0:
                env.power_failure_active = False
                self._log_event("power_restored", "Power generation fully restored")

        # Update each zone
        num_irrigating = 0
        num_active = 0
        for zone in self.state.zones:
            # --- Physics always update (even quarantined zones) ---

            # Apply priority-based adjustments
            effective_temp_setpoint = zone.temperature_setpoint
            if zone.priority == "low":
                effective_temp_setpoint -= 2.0
            elif zone.priority == "hibernate":
                effective_temp_setpoint -= 5.0
                zone.lighting_on = False
                zone.par_level = 0.0
            elif zone.priority == "sacrifice":
                effective_temp_setpoint = 5.0  # minimum clamp
                zone.lighting_on = False
                zone.par_level = 0.0

            # Lighting: off at night unless high priority (skip if hibernate/sacrifice already forced off)
            if zone.priority not in ("hibernate", "sacrifice"):
                if not is_daytime and zone.priority != "high":
                    zone.lighting_on = False
                    zone.par_level = 0.0
                else:
                    if zone.lighting_on:
                        base_par = zone.par_setpoint
                        if env.dust_storm_active:
                            base_par *= max(0.05, 1.0 - (env.dust_opacity_tau / 6.0))
                        zone.par_level = base_par
                    else:
                        zone.par_level = 0.0

            # Temperature always drifts
            heating_power = POWER_HEATING_KW if zone.temperature < effective_temp_setpoint else 0.5
            if zone.priority == "sacrifice":
                heating_power = 0.0  # no heating for sacrificed zones
            zone.temperature = update_greenhouse_temperature(
                zone.temperature, env.external_temp_c, heating_power, dt,
                target_temp=effective_temp_setpoint,
            )

            # CO2 and humidity always update
            zone.co2_ppm = update_co2(zone.co2_ppm, 1, is_daytime, dt)
            water_ok = self.state.resources.water_reservoir_l > 10.0 and zone.irrigation_rate_l_per_hour > 0
            zone.humidity = update_humidity(zone.humidity, 1 if water_ok else 0, dt, target_humidity=zone.humidity_setpoint)

            # --- Skip crop growth and irrigation for quarantined zones ---
            if zone.is_quarantined:
                continue

            num_active += 1

            if water_ok:
                num_irrigating += 1

            for crop in zone.crops:
                if crop.growth_stage == GrowthStage.HARVESTED:
                    continue
                if crop.health <= 0:
                    crop.growth_stage = GrowthStage.HARVESTED
                    continue

                crop_data = CROP_DATABASE.get(crop.crop_name, {})
                increment = compute_growth_increment(crop, crop_data, zone, water_ok, dt)
                crop.biomass_g += increment
                crop.days_planted += dt / 24.0

                # Update growth stage
                progress = crop.days_planted / max(crop.days_to_harvest, 1)
                if progress < 0.2:
                    crop.growth_stage = GrowthStage.SEEDLING
                elif progress < 0.5:
                    crop.growth_stage = GrowthStage.VEGETATIVE
                elif progress < 0.7:
                    crop.growth_stage = GrowthStage.FLOWERING
                elif progress < 0.95:
                    crop.growth_stage = GrowthStage.FRUITING
                else:
                    crop.growth_stage = GrowthStage.MATURE

        # Disease progression and spread
        self._tick_diseases(dt)
        self._spread_diseases()

        # Random events (once per sol)
        if tick_in_sol == 0:
            self._check_random_events()

        # Sync legacy disease fields
        env.disease_active = len(self.state.diseases) > 0
        symptomatic = [d for d in self.state.diseases if d.stage != "incubating"]
        env.disease_zone_id = symptomatic[0].zone_id if symptomatic else None

        # Reset daily water counter at start of new sol (before consumption)
        if tick_in_sol == 0:
            self.state.resources.water_consumed_today_l = 0.0

        # Global resource updates
        update_water(self.state, dt)
        update_power(self.state, env.solar_irradiance_w_m2, dt)
        update_nutrient_solution(self.state, dt)

        # Tick sensor failure timers
        tick_sensor_failures()

        # Brownout: automatic load shedding based on battery level
        self._apply_brownout()

        # Overripe crop decay
        self._apply_overripe_decay()

        # Crew health based on nutritional coverage
        self._update_crew_health()

    def _apply_brownout(self) -> None:
        """Tiered automatic load shedding when battery is low."""
        res = self.state.resources
        battery_pct = (res.battery_charge_kwh / res.battery_capacity_kwh) * 100.0

        # Determine which tier we're in (with hysteresis for recovery)
        for zone in self.state.zones:
            if battery_pct < BROWNOUT_TIER3_PERCENT:
                # Emergency: all lights off
                zone.lighting_on = False
                zone.par_level = 0.0
            elif battery_pct < BROWNOUT_TIER2_PERCENT:
                # Severe: only high-priority zones keep lights
                if zone.priority != "high":
                    zone.lighting_on = False
                    zone.par_level = 0.0
            elif battery_pct < BROWNOUT_TIER1_PERCENT:
                # Moderate: shed sacrifice and low priority
                if zone.priority in ("sacrifice", "low"):
                    zone.lighting_on = False
                    zone.par_level = 0.0
            # Hysteresis: only restore if above threshold + offset
            # (lights stay off until battery recovers enough)
            elif battery_pct < BROWNOUT_TIER1_PERCENT + BROWNOUT_HYSTERESIS:
                pass  # in hysteresis band — don't change current state

        if battery_pct < BROWNOUT_TIER3_PERCENT:
            self._log_event("brownout_emergency", "Emergency brownout: ALL lights shed")
        elif battery_pct < BROWNOUT_TIER2_PERCENT:
            self._log_event("brownout_severe", "Severe brownout: non-high-priority lights shed")
        elif battery_pct < BROWNOUT_TIER1_PERCENT:
            self._log_event("brownout_moderate", "Moderate brownout: sacrifice/low zone lights shed")

    def _apply_overripe_decay(self) -> None:
        """Decay crops that have been mature past their grace period."""
        for zone in self.state.zones:
            for crop in zone.crops:
                if crop.growth_stage == GrowthStage.HARVESTED or crop.health <= 0:
                    continue
                crop_data = CROP_DATABASE.get(crop.crop_name, {})
                grace = crop_data.get("overripe_grace_days", 30)
                days_to_harvest = crop_data.get("days_to_harvest", crop.days_to_harvest)
                if crop.days_planted > days_to_harvest + grace:
                    decay_rate = 100.0 / (grace * 4)  # 4 ticks per day
                    crop.health = max(0.0, crop.health - decay_rate)

    def _update_crew_health(self) -> None:
        """Adjust crew health based on calorie coverage.

        The greenhouse targets 80% of crew calories — Earth rations cover the rest.
        Health only decays when coverage drops below that 80% threshold.
        """
        coverage = compute_nutrition_coverage(self.state)
        cal_data = coverage.get("calories_kcal", {})
        calorie_pct = cal_data.get("coverage_percent", 0.0) / 100.0

        # 80% coverage = fully fed (Earth rations supplement the rest)
        greenhouse_target = 0.80
        if calorie_pct < greenhouse_target:
            deficit = (greenhouse_target - calorie_pct) / greenhouse_target
            self.state.crew_health = max(
                0.0, self.state.crew_health - deficit * CREW_HEALTH_DECAY_PER_TICK
            )
        else:
            self.state.crew_health = min(
                100.0, self.state.crew_health + CREW_HEALTH_RECOVERY_PER_TICK
            )

    def _compute_disease_env_modifier(self, disease: DiseaseState, zone: "Zone") -> float:
        """Compute environmental modifier (0.0–2.0) for disease progression."""
        dtype = disease.disease_type
        if dtype == "pythium_root_rot":
            if zone.humidity > 75:
                return 1.5
            elif zone.humidity < 60:
                return 0.5
            return 1.0
        elif dtype == "powdery_mildew":
            if zone.humidity < 50:
                return 0.0  # mildew stops below 50% humidity
            elif zone.humidity > 70:
                return 1.4
            return 1.0
        elif dtype == "bacterial_wilt":
            if zone.temperature > 28:
                return 1.5
            elif zone.temperature < 20:
                return 0.5
            return 1.0
        return 1.0

    def _tick_diseases(self, dt: float) -> None:
        """Progress all active diseases through their stages."""
        to_remove = []
        for disease in self.state.diseases:
            zone = self._get_zone(disease.zone_id)
            if not zone:
                to_remove.append(disease)
                continue

            env_mod = self._compute_disease_env_modifier(disease, zone)
            disease.ticks_in_stage += 1

            if disease.stage == "incubating":
                disease.severity += 2.0 * env_mod
                threshold = DISEASE_INCUBATION_TICKS.get(disease.disease_type, 3)
                if disease.ticks_in_stage >= threshold:
                    disease.stage = "symptomatic"
                    disease.ticks_in_stage = 0
                    self._log_event(
                        "disease_symptomatic",
                        f"{disease.disease_type} in Zone {disease.zone_id} is now symptomatic",
                        zones=[disease.zone_id],
                        params={"disease_type": disease.disease_type, "severity": disease.severity},
                    )

            elif disease.stage == "symptomatic":
                disease.severity += 3.0 * env_mod
                # Apply crop damage
                damage = DISEASE_DAMAGE_SYMPTOMATIC.get(disease.disease_type, 5.0) * env_mod
                if disease.treated_uvc:
                    damage *= 0.3
                if disease.treated_h2o2:
                    damage *= 0.5
                if not zone.is_quarantined:
                    for crop in zone.crops:
                        if crop.health > 0 and crop.growth_stage != GrowthStage.HARVESTED:
                            crop.health = max(0.0, crop.health - damage * (dt / 6.0))

                if disease.severity >= 60:
                    disease.stage = "critical"
                    disease.ticks_in_stage = 0
                    self._log_event(
                        "disease_critical",
                        f"{disease.disease_type} in Zone {disease.zone_id} is now CRITICAL",
                        zones=[disease.zone_id],
                        params={"disease_type": disease.disease_type, "severity": disease.severity},
                    )

            elif disease.stage == "critical":
                disease.severity += 5.0 * env_mod
                damage = DISEASE_DAMAGE_CRITICAL.get(disease.disease_type, 10.0) * env_mod
                if disease.treated_uvc:
                    damage *= 0.3
                if disease.treated_h2o2:
                    damage *= 0.5
                if not zone.is_quarantined:
                    for crop in zone.crops:
                        if crop.health > 0 and crop.growth_stage != GrowthStage.HARVESTED:
                            crop.health = max(0.0, crop.health - damage * (dt / 6.0))

            # Water contamination for water-borne diseases
            spread_rate = DISEASE_WATER_SPREAD_RATE.get(disease.disease_type, 0.0)
            if spread_rate > 0 and zone.substrate == "hydro" and not zone.is_quarantined:
                rate = spread_rate * env_mod
                if disease.treated_uvc:
                    rate *= 0.01  # UV-C 99% effective at reducing contamination
                if disease.treated_h2o2:
                    rate *= 0.35  # H2O2 65% effective
                disease.water_contamination = min(1.0, disease.water_contamination + rate)

            # Severity decrease under treatment
            if disease.treated_uvc and zone.humidity < 60:
                disease.severity = max(0.0, disease.severity - 2.0)
            elif disease.treated_h2o2 and zone.humidity < 55:
                disease.severity = max(0.0, disease.severity - 1.0)

            # Resolution checks
            all_dead = all(c.health <= 0 or c.growth_stage == GrowthStage.HARVESTED for c in zone.crops)
            if all_dead or disease.severity < 5.0:
                to_remove.append(disease)
                self._log_event(
                    "disease_cleared",
                    f"{disease.disease_type} cleared in Zone {disease.zone_id}",
                    zones=[disease.zone_id],
                )

        for d in to_remove:
            if d in self.state.diseases:
                self.state.diseases.remove(d)

    def _spread_diseases(self) -> None:
        """Spread water-borne diseases between hydro zones B, C, D."""
        hydro_zones = ["B", "C", "D"]
        new_diseases = []
        for disease in self.state.diseases:
            if disease.water_contamination <= DISEASE_SPREAD_THRESHOLD:
                continue
            source_zone = self._get_zone(disease.zone_id)
            if not source_zone or source_zone.is_quarantined:
                continue  # quarantine cuts water pipe
            for target_zid in hydro_zones:
                if target_zid == disease.zone_id:
                    continue
                # Skip if target already has this disease type
                if any(d.zone_id == target_zid and d.disease_type == disease.disease_type
                       for d in self.state.diseases):
                    continue
                if any(d.zone_id == target_zid and d.disease_type == disease.disease_type
                       for d in new_diseases):
                    continue
                spread_chance = disease.water_contamination * DISEASE_SPREAD_CHANCE_PER_TICK
                if random.random() < spread_chance:
                    new_diseases.append(DiseaseState(
                        disease_type=disease.disease_type,
                        zone_id=target_zid,
                        stage="incubating",
                        severity=5.0,
                    ))
                    self._log_event(
                        "disease_spread",
                        f"{disease.disease_type} spread from Zone {disease.zone_id} to Zone {target_zid}",
                        zones=[disease.zone_id, target_zid],
                        params={"disease_type": disease.disease_type},
                    )
        self.state.diseases.extend(new_diseases)

    def _check_random_events(self) -> None:
        """Roll for random events once per sol."""
        env = self.state.environment

        # Dust storm
        if not env.dust_storm_active and random.random() < DUST_STORM_PROBABILITY_PER_SOL:
            self.trigger_event("dust_storm", {"severity": "regional"})

        # Disease
        if random.random() < DISEASE_PROBABILITY_PER_SOL:
            # Hydro zones 3× more likely
            weights = []
            for z in self.state.zones:
                weights.append(3.0 if z.substrate == "hydro" else 1.0)
            zone = random.choices(self.state.zones, weights=weights, k=1)[0]
            # Pick disease type matching substrate
            if zone.substrate == "hydro":
                dtype = random.choice(["pythium_root_rot", "powdery_mildew"])
            else:
                dtype = random.choice(["bacterial_wilt", "powdery_mildew"])
            # Only trigger if not already infected with same type
            if not any(d.zone_id == zone.zone_id and d.disease_type == dtype
                       for d in self.state.diseases):
                self.trigger_event("disease", {"zone_id": zone.zone_id, "disease_type": dtype})

        # Power failure
        if not env.power_failure_active and random.random() < POWER_FAILURE_PROBABILITY_PER_SOL:
            reduction = random.uniform(0.2, 0.6)
            self.trigger_event("power_failure", {"reduction": reduction})

    def apply_command(self, command: dict) -> dict:
        """Apply a command from the agent or user.

        Command format: {action: str, zone_id: str, params: dict}
        """
        action = command.get("action", "")
        zone_id = command.get("zone_id")
        params = command.get("params", {})

        zone = self._get_zone(zone_id) if zone_id else None

        # Validate zone_id when required
        zone_actions = {"adjust_irrigation", "adjust_temperature", "adjust_lighting",
                        "set_zone_priority", "quarantine_zone", "harvest_crop", "plant_crop",
                        "treat_disease_uvc", "treat_disease_h2o2", "adjust_humidity", "remove_infected_crops"}
        if action in zone_actions and not zone:
            if not zone_id:
                return {"status": "error", "message": f"zone_id is required for action '{action}'"}
            return {"status": "error", "message": f"Zone '{zone_id}' not found"}

        if action == "adjust_irrigation" and zone:
            try:
                rate = float(params.get("rate", zone.irrigation_rate_l_per_hour))
            except (TypeError, ValueError):
                return {"status": "error", "message": "Invalid rate value: must be a number"}
            if rate < 0 or rate > 10:
                return {"status": "error", "message": "Irrigation rate must be between 0 and 10 L/hr"}
            zone.irrigation_rate_l_per_hour = rate
            return {"status": "ok", "message": f"Zone {zone_id} irrigation set to {zone.irrigation_rate_l_per_hour} L/hr"}

        elif action == "adjust_temperature" and zone:
            try:
                target = float(params.get("target", zone.temperature_setpoint))
            except (TypeError, ValueError):
                return {"status": "error", "message": "Invalid target value: must be a number"}
            if not (5 <= target <= 40):
                return {"status": "error", "message": "Temperature target must be between 5 and 40°C"}
            zone.temperature_setpoint = target
            return {"status": "ok", "message": f"Zone {zone_id} temperature target set to {zone.temperature_setpoint}°C"}

        elif action == "adjust_lighting" and zone:
            try:
                par = float(params.get("par", zone.par_setpoint))
            except (TypeError, ValueError):
                return {"status": "error", "message": "Invalid par value: must be a number"}
            try:
                photoperiod = float(params.get("photoperiod", zone.photoperiod_hours))
            except (TypeError, ValueError):
                return {"status": "error", "message": "Invalid photoperiod value: must be a number"}
            if not (0 <= par <= 1000):
                return {"status": "error", "message": "PAR must be between 0 and 1000"}
            if not (0 <= photoperiod <= 24):
                return {"status": "error", "message": "Photoperiod must be between 0 and 24 hours"}
            on_value = params.get("on", zone.lighting_on)
            if isinstance(on_value, str):
                zone.lighting_on = on_value.lower() in ("true", "1", "yes")
            else:
                zone.lighting_on = bool(on_value)
            zone.par_setpoint = par
            zone.par_level = par
            zone.photoperiod_hours = photoperiod
            return {"status": "ok", "message": f"Zone {zone_id} lighting updated"}

        elif action == "set_zone_priority" and zone:
            priority = params.get("priority", "normal")
            valid_priorities = {"normal", "high", "low", "hibernate", "sacrifice"}
            if priority not in valid_priorities:
                return {"status": "error", "message": f"Priority must be one of {valid_priorities}"}
            zone.priority = priority
            return {"status": "ok", "message": f"Zone {zone_id} priority set to {zone.priority}"}

        elif action == "quarantine_zone" and zone:
            q_value = params.get("quarantine", True)
            if isinstance(q_value, str):
                zone.is_quarantined = q_value.lower() in ("true", "1", "yes")
            else:
                zone.is_quarantined = bool(q_value)
            return {"status": "ok", "message": f"Zone {zone_id} quarantine={'on' if zone.is_quarantined else 'off'}"}

        elif action == "harvest_crop" and zone:
            crop_name = params.get("crop_name")
            if not crop_name:
                return {"status": "error", "message": "crop_name is required"}
            crop_name = crop_name.strip().lower()
            for crop in zone.crops:
                if crop.crop_name == crop_name:
                    if crop.growth_stage == GrowthStage.HARVESTED:
                        return {"status": "error", "message": f"Crop {crop_name} already harvested"}
                    if crop.health <= 0:
                        return {"status": "error", "message": f"Crop {crop_name} is dead, cannot harvest"}
                    crop.growth_stage = GrowthStage.HARVESTED
                    harvested = crop.biomass_g
                    crop.biomass_g = 0
                    crop.days_planted = 0
                    crop.health = 100
                    return {"status": "ok", "message": f"Harvested {harvested:.0f}g of {crop_name}", "harvested_g": harvested}
            return {"status": "error", "message": f"Crop {crop_name} not found in zone {zone_id}"}

        elif action == "plant_crop" and zone:
            crop_name = params.get("crop_name")
            if not crop_name:
                return {"status": "error", "message": "crop_name is required"}
            crop_name = crop_name.strip().lower()
            if not crop_name:
                return {"status": "error", "message": "crop_name is required"}
            crop_data = CROP_DATABASE.get(crop_name, {})
            if not crop_data:
                return {"status": "error", "message": f"Unknown crop: {crop_name}"}
            # Reject if non-harvested crop of same name already exists
            if any(c.crop_name == crop_name and c.growth_stage != GrowthStage.HARVESTED for c in zone.crops):
                return {"status": "error", "message": f"Crop {crop_name} already planted in zone {zone_id}"}
            # Remove harvested crops of same name to free the slot
            zone.crops = [c for c in zone.crops if not (c.crop_name == crop_name and c.growth_stage == GrowthStage.HARVESTED)]
            zone.crops.append(
                CropStatus(
                    crop_name=crop_name,
                    days_to_harvest=crop_data.get("days_to_harvest", 30),
                    yield_per_m2_per_day=crop_data.get("yield_per_m2_per_day", 15.0),
                    water_use_l_per_m2_per_day=crop_data.get("water_use_l_per_m2_per_day", 0.5),
                )
            )
            return {"status": "ok", "message": f"Planted {crop_name} in zone {zone_id}"}

        elif action == "treat_disease_uvc" and zone:
            zone_diseases = [d for d in self.state.diseases if d.zone_id == zone.zone_id]
            if not zone_diseases:
                return {"status": "ok", "message": f"No active disease in Zone {zone_id} — UV-C applied preventatively"}
            for d in zone_diseases:
                d.treated_uvc = True
                d.water_contamination *= 0.01
            self.state.resources.power_consumption_kw += UVC_POWER_COST_KW
            return {"status": "ok", "message": f"UV-C treatment applied in Zone {zone_id} (+{UVC_POWER_COST_KW}kW power)"}

        elif action == "treat_disease_h2o2" and zone:
            zone_diseases = [d for d in self.state.diseases if d.zone_id == zone.zone_id]
            if not zone_diseases:
                return {"status": "ok", "message": f"No active disease in Zone {zone_id} — H₂O₂ applied preventatively"}
            for d in zone_diseases:
                d.treated_h2o2 = True
                d.water_contamination *= 0.35
            self.state.resources.nutrient_solution_ec += H2O2_EC_INCREASE
            return {"status": "ok", "message": f"H₂O₂ treatment applied in Zone {zone_id} (EC +{H2O2_EC_INCREASE})"}

        elif action == "adjust_humidity" and zone:
            try:
                target = float(params.get("target_humidity", zone.humidity_setpoint))
            except (TypeError, ValueError):
                return {"status": "error", "message": "Invalid target_humidity value: must be a number"}
            if not (30 <= target <= 90):
                return {"status": "error", "message": "Humidity setpoint must be between 30 and 90%"}
            zone.humidity_setpoint = target
            return {"status": "ok", "message": f"Zone {zone_id} humidity setpoint set to {target}%"}

        elif action == "remove_infected_crops" and zone:
            crop_name = params.get("crop_name")
            if not crop_name:
                return {"status": "error", "message": "crop_name is required"}
            crop_name = crop_name.strip().lower()
            for crop in zone.crops:
                if crop.crop_name == crop_name:
                    crop.health = 0.0
                    crop.growth_stage = GrowthStage.HARVESTED
                    # Reduce disease severity in this zone
                    for d in self.state.diseases:
                        if d.zone_id == zone.zone_id:
                            d.severity = max(0.0, d.severity - 30.0)
                    return {"status": "ok", "message": f"Removed infected {crop_name} from Zone {zone_id}, disease severity -30"}
            return {"status": "error", "message": f"Crop {crop_name} not found in Zone {zone_id}"}

        elif action == "deploy_microgreens":
            # Find first available non-quarantined zone (prefer zone D)
            target_zone = self._get_zone("D")
            if target_zone and target_zone.is_quarantined:
                target_zone = None
            if not target_zone:
                for z in self.state.zones:
                    if not z.is_quarantined:
                        target_zone = z
                        break
            if not target_zone:
                return {"status": "error", "message": "All zones are quarantined"}
            # Clean up dead/harvested microgreens before counting
            target_zone.crops = [c for c in target_zone.crops if not (c.crop_name == "microgreens" and (c.growth_stage == GrowthStage.HARVESTED or c.health <= 0))]
            existing = sum(1 for c in target_zone.crops if c.crop_name == "microgreens")
            if existing >= 3:
                return {"status": "error", "message": "Maximum microgreens deployments (3) reached"}
            crop_data = CROP_DATABASE["microgreens"]
            target_zone.crops.append(
                CropStatus(
                    crop_name="microgreens",
                    days_to_harvest=crop_data["days_to_harvest"],
                    yield_per_m2_per_day=crop_data["yield_per_m2_per_day"],
                    water_use_l_per_m2_per_day=crop_data["water_use_l_per_m2_per_day"],
                )
            )
            return {"status": "ok", "message": "Emergency microgreens deployed"}

        elif action == "adjust_nutrient_solution":
            if "ph" in params:
                try:
                    ph = float(params["ph"])
                except (TypeError, ValueError):
                    return {"status": "error", "message": "Invalid ph value: must be a number"}
                if not (0 <= ph <= 14):
                    return {"status": "error", "message": "pH must be between 0 and 14"}
                self.state.resources.nutrient_solution_ph = ph
            if "ec" in params:
                try:
                    ec = float(params["ec"])
                except (TypeError, ValueError):
                    return {"status": "error", "message": "Invalid ec value: must be a number"}
                if not (0 <= ec <= 10):
                    return {"status": "error", "message": "EC must be between 0 and 10"}
                self.state.resources.nutrient_solution_ec = ec
            return {"status": "ok", "message": "Nutrient solution adjusted"}

        return {"status": "error", "message": f"Unknown action: {action}"}

    def trigger_event(self, event_type: str, params: dict | None = None) -> dict:
        """Trigger a crisis event. Delegated to events module."""
        from simulation.events import trigger_event
        return trigger_event(self, event_type, params or {})

    def _get_zone(self, zone_id: str) -> "Zone | None":
        zone_id_upper = zone_id.upper()
        for z in self.state.zones:
            if z.zone_id == zone_id_upper:
                return z
        return None

    def _log_event(self, event_type: str, description: str, zones: list[str] | None = None, params: dict | None = None) -> None:
        self.state.event_log.append(
            EventLogEntry(
                sol=self.state.environment.sol,
                tick=self.state.environment.tick,
                event_type=event_type,
                description=description,
                affected_zones=zones or [],
                params=params or {},
            )
        )
        if len(self.state.event_log) > 1000:
            self.state.event_log = self.state.event_log[-1000:]