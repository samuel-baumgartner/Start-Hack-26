"""SimulationEngine: tick(), apply_command(), trigger_event()."""

from __future__ import annotations

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
    EventLogEntry,
    GrowthStage,
    GreenhouseState,
    create_default_state,
)
from config import POWER_HEATING_KW, SIMULATION_TICK_HOURS


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
            if zone.is_quarantined:
                continue
            num_active += 1

            # Lighting: off at night unless overridden
            if not is_daytime and zone.priority != "high":
                zone.lighting_on = False
                zone.par_level = 0.0
            else:
                zone.lighting_on = True
                # PAR based on zone setpoint, reduced during dust storms
                base_par = zone.par_setpoint
                if env.dust_storm_active:
                    base_par *= max(0.05, 1.0 - (env.dust_opacity_tau / 6.0))
                zone.par_level = base_par

            # Temperature drifts toward zone setpoint
            heating_power = POWER_HEATING_KW if zone.temperature < zone.temperature_setpoint else 0.5
            zone.temperature = update_greenhouse_temperature(
                zone.temperature, env.external_temp_c, heating_power, dt,
                target_temp=zone.temperature_setpoint,
            )

            # Grow crops
            water_ok = self.state.resources.water_reservoir_l > 10.0 and zone.irrigation_rate_l_per_hour > 0
            if water_ok:
                num_irrigating += 1

            for crop in zone.crops:
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

                # Disease damage
                if (
                    env.disease_active
                    and env.disease_zone_id == zone.zone_id
                ):
                    crop.health = max(0.0, crop.health - 7.0 * (dt / 6.0))

            # CO2 and humidity
            zone.co2_ppm = update_co2(zone.co2_ppm, 1, is_daytime, dt)
            zone.humidity = update_humidity(zone.humidity, 1 if water_ok else 0, dt)

        # Disease clearing: disease resolves if affected zone is quarantined or all crops dead
        if env.disease_active and env.disease_zone_id:
            disease_zone = self._get_zone(env.disease_zone_id)
            if disease_zone:
                all_dead = all(c.health <= 0 for c in disease_zone.crops)
                if disease_zone.is_quarantined or all_dead:
                    env.disease_active = False
                    env.disease_zone_id = None
                    self._log_event("disease_cleared", f"Disease cleared in Zone {disease_zone.zone_id}")

        # Global resource updates
        update_water(self.state, dt)
        update_power(self.state, env.solar_irradiance_w_m2, dt)
        update_nutrient_solution(self.state, dt)

        # Reset daily water counter at start of new sol
        if tick_in_sol == 0:
            self.state.resources.water_consumed_today_l = 0.0

        # Tick sensor failure timers
        tick_sensor_failures()

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
                        "set_zone_priority", "quarantine_zone", "harvest_crop", "plant_crop"}
        if action in zone_actions and not zone:
            return {"status": "error", "message": f"Zone '{zone_id}' not found"}

        if action == "adjust_irrigation" and zone:
            rate = params.get("rate", zone.irrigation_rate_l_per_hour)
            if rate < 0:
                return {"status": "error", "message": "Irrigation rate must be >= 0"}
            zone.irrigation_rate_l_per_hour = rate
            return {"status": "ok", "message": f"Zone {zone_id} irrigation set to {zone.irrigation_rate_l_per_hour} L/hr"}

        elif action == "adjust_temperature" and zone:
            target = params.get("target", zone.temperature_setpoint)
            if not (5 <= target <= 40):
                return {"status": "error", "message": "Temperature target must be between 5 and 40°C"}
            zone.temperature_setpoint = target
            return {"status": "ok", "message": f"Zone {zone_id} temperature target set to {zone.temperature_setpoint}°C"}

        elif action == "adjust_lighting" and zone:
            par = params.get("par", zone.par_setpoint)
            photoperiod = params.get("photoperiod", zone.photoperiod_hours)
            if not (0 <= par <= 1000):
                return {"status": "error", "message": "PAR must be between 0 and 1000"}
            if not (0 <= photoperiod <= 24):
                return {"status": "error", "message": "Photoperiod must be between 0 and 24 hours"}
            zone.lighting_on = params.get("on", zone.lighting_on)
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
            zone.is_quarantined = params.get("quarantine", True)
            return {"status": "ok", "message": f"Zone {zone_id} quarantine={'on' if zone.is_quarantined else 'off'}"}

        elif action == "harvest_crop" and zone:
            crop_name = params.get("crop_name")
            for crop in zone.crops:
                if crop.crop_name == crop_name:
                    crop.growth_stage = GrowthStage.HARVESTED
                    harvested = crop.biomass_g
                    crop.biomass_g = 0
                    crop.days_planted = 0
                    crop.health = 100
                    return {"status": "ok", "message": f"Harvested {harvested:.0f}g of {crop_name}", "harvested_g": harvested}
            return {"status": "error", "message": f"Crop {crop_name} not found in zone {zone_id}"}

        elif action == "plant_crop" and zone:
            crop_name = params.get("crop_name")
            crop_data = CROP_DATABASE.get(crop_name, {})
            if not crop_data:
                return {"status": "error", "message": f"Unknown crop: {crop_name}"}
            zone.crops.append(
                CropStatus(
                    crop_name=crop_name,
                    days_to_harvest=crop_data.get("days_to_harvest", 30),
                    yield_per_m2_per_day=crop_data.get("yield_per_m2_per_day", 15.0),
                    water_use_l_per_m2_per_day=crop_data.get("water_use_l_per_m2_per_day", 0.5),
                )
            )
            return {"status": "ok", "message": f"Planted {crop_name} in zone {zone_id}"}

        elif action == "deploy_microgreens":
            # Find first available zone or add to zone F
            target_zone = self._get_zone("F") or self.state.zones[-1]
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
                ph = params["ph"]
                if not (0 <= ph <= 14):
                    return {"status": "error", "message": "pH must be between 0 and 14"}
                self.state.resources.nutrient_solution_ph = ph
            if "ec" in params:
                ec = params["ec"]
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
        for z in self.state.zones:
            if z.zone_id == zone_id:
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
