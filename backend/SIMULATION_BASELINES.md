# Simulation Baselines — Complete Parameter Reference

> **Generated from source code inspection, 2026-03-19.**
> Every numerical constant in the Mars greenhouse simulation, with source location, units, and realism notes.

---

## 1. POWER BUDGET — CRITICAL IMBALANCE

> **The simulation's energy balance is fundamentally broken.** The battery will drain to 0% within 1–2 ticks under all conditions. This section explains why.

### Generation vs Consumption

| Metric | Value | Derivation |
|--------|-------|-----------|
| Peak solar irradiance | 590 W/m² | `config.py:8` — Mars orbital average |
| Panel area | 50 m² | `resources.py:51` (hardcoded in `compute_solar_power`) |
| Panel base efficiency | 20% | `resources.py:52` |
| **Peak solar generation (no dust)** | **5.90 kW** | 590 × 50 × 0.20 / 1000 |
| Initial dust opacity tau | 0.5 | `state.py:81` — `EnvironmentState.dust_opacity_tau` default |
| Beer-Lambert attenuation at tau=0.5 | 0.607 | e^(−0.5) |
| **Realistic peak generation (tau=0.5)** | **3.58 kW** | 5.90 × 0.607 |
| Solar window | hours 5.0–19.5 | `environment.py:36` — sinusoidal, zero outside |
| **Average generation over a sol** | **~1.8 kW** | integral of sin curve × 0.607, ~14.5h window / 24.62h sol |

### Consumption Breakdown

| Subsystem | Value (kW) | Source | Notes |
|-----------|-----------|--------|-------|
| Lighting (per zone, 6 zones max) | 1.5 each | `config.py:59` | 9.0 kW total if all 6 lit |
| Heating (active) | 4.0 | `config.py:60` | When any zone < 20°C |
| Heating (standby) | 0.5 | `resources.py:62` | When all zones ≥ 20°C |
| Pumps | 1.0 | `config.py:61` | Always on |
| Monitoring | 0.5 | `config.py:62` | Always on |
| Life support | 3.0 | `config.py:63` | Always on |
| **Typical total (all lights on, heating active)** | **17.5 kW** | 9.0 + 4.0 + 1.0 + 0.5 + 3.0 |
| **Minimum total (all lights off, heating standby)** | **5.0 kW** | 0.0 + 0.5 + 1.0 + 0.5 + 3.0 |

### Battery

| Parameter | Value | Source |
|-----------|-------|--------|
| Capacity | 100 kWh | `config.py:66` |
| Initial charge | 80% (80 kWh) | `config.py:67` |

### The Math That Kills the Battery

**Best case (solar noon, no dust, all lights off):**
- Generation: 5.90 kW
- Consumption: 5.0 kW (minimum)
- Net: **+0.90 kW** (barely positive, only at peak)

**Typical case (daytime, tau=0.5, all lights on):**
- Generation: ~3.58 kW peak, ~1.8 kW average
- Consumption: 17.5 kW
- Net: **−13.9 kW** (peak) to **−15.7 kW** (average)
- Energy loss per 6h tick: **−83.4 to −94.2 kWh**

**Night (14+ hours of each sol):**
- Generation: 0 kW
- Consumption: 17.5 kW (heating needed because external temp drops)
- Energy loss per 6h tick: **−105 kWh**
- Battery (80 kWh) drains completely in: **< 1 tick**

**The `GREENHOUSE_POWER_BUDGET_KW = 20` (`config.py:24`) acknowledges a ~20 kW budget, but generation peaks at 5.9 kW — a 3.4× shortfall.**

### Possible Fixes (not implemented here)

1. Increase `BATTERY_CAPACITY_KWH` to ~2000+ kWh (Mars habitat would use RTGs or nuclear)
2. Add nuclear/RTG baseline generation of ~15 kW
3. Increase panel area to 500+ m² or efficiency to 40%+
4. Reduce lighting power (LED systems use ~0.1–0.3 kW per zone, not 1.5)
5. Reduce heating power (good insulation on Mars would need < 1 kW)

---

## 2. Mission & Crew

| Parameter | Value | Unit | Source |
|-----------|-------|------|--------|
| Crew size | 4 | astronauts | `config.py:2` |
| Mission duration | 450 | sols | `config.py:3` |
| Growing area | 50 | m² | `config.py:4` |
| Number of zones | 6 | — | `config.py:55` |
| Area per zone | 8.33 | m² | `config.py:56` (50/6) |

**Realism:** NASA's Veggie system on ISS is only ~0.13 m². A Mars habitat with 50 m² of growing area is ambitious but within range of NASA BLSS (Bioregenerative Life Support System) studies, which estimate 40–50 m² per person for full caloric self-sufficiency.

---

## 3. Mars Environment

| Parameter | Value | Unit | Source | Real Mars |
|-----------|-------|------|--------|-----------|
| Surface gravity | 3.72 | m/s² | `config.py:7` | 3.721 m/s² — correct |
| Peak solar irradiance | 590 | W/m² | `config.py:8` | ~590 W/m² at perihelion — correct |
| Sol length | 24.62 | hours | `config.py:9` | 24h 39m 35s = 24.66h — close |
| Atmosphere CO2 | 95.3 | % | `config.py:10` | 95.32% — correct |
| Average surface temp | −60 | °C | `config.py:11` | −60°C global average — correct |
| Comms delay (min) | 4 | minutes | `config.py:12` | 4.3 min at closest — correct |
| Comms delay (max) | 24 | minutes | `config.py:13` | 24.0 min at farthest — correct |

### Temperature Model

| Parameter | Value | Source |
|-----------|-------|--------|
| Daily amplitude | ±30 °C | `environment.py:50` |
| Peak hour | 14 (2 PM) | `environment.py:52` |
| Range | −90 to −30 °C | −60 ± 30 |
| Formula | `T_avg + 30 × cos(2π(h−14)/24.62)` | `environment.py:53` |

**Realism:** Mars diurnal temperature swing is typically 70–100°C (e.g., −73°C to +20°C at equator). The ±30°C amplitude is conservative.

### Solar Irradiance Model

| Parameter | Value | Source |
|-----------|-------|--------|
| Sunrise | hour 5.0 | `environment.py:36` |
| Sunset | hour 19.5 | `environment.py:36` |
| Day length | 14.5 hours | 19.5 − 5.0 |
| Peak | hour 12.25 | midpoint of sine curve |
| Formula | `590 × sin(π(h−5)/14.5) × e^(−tau)` | `environment.py:39–43` |
| Normal dust tau | 0.3–1.0 | `state.py:81` comment |
| Default tau | 0.5 | `state.py:81` |

**Realism:** The Beer-Lambert dust attenuation model is physically correct. Tau values: clear Mars ~0.5, regional storm 2–4, global storm 4–6+.

---

## 4. Greenhouse Targets

| Parameter | Value | Unit | Source |
|-----------|-------|------|--------|
| Temperature target | 22 | °C | `config.py:16` |
| Humidity target | 70 | % | `config.py:17` |
| CO2 target | 1200 | ppm | `config.py:18` |
| Pressure | 101.3 | kPa | `config.py:19` |
| Photoperiod | 18 | hours | `config.py:20` |
| PAR target | 400 | µmol/m²/s | `config.py:21` |
| Water budget (initial) | 1000 | L | `config.py:22` |
| Water recycling efficiency | 90% | — | `config.py:23` |
| Power budget | 20 | kW | `config.py:24` |

**Realism:** 1200 ppm CO2 is standard for greenhouse enrichment (Earth greenhouses use 800–1500 ppm). 400 µmol/m²/s PAR is moderate (full sunlight is ~2000). 18h photoperiod is common for leafy greens.

---

## 5. Power Subsystem

Detailed in Section 1 above. Key source locations:

| Constant | Value | Source |
|----------|-------|--------|
| `POWER_LIGHTING_PER_ZONE_KW` | 1.5 kW | `config.py:59` |
| `POWER_HEATING_KW` | 4.0 kW | `config.py:60` |
| `POWER_PUMPS_KW` | 1.0 kW | `config.py:61` |
| `POWER_MONITORING_KW` | 0.5 kW | `config.py:62` |
| `POWER_LIFE_SUPPORT_KW` | 3.0 kW | `config.py:63` |
| `BATTERY_CAPACITY_KWH` | 100.0 kWh | `config.py:66` |
| `BATTERY_INITIAL_CHARGE` | 0.80 (80%) | `config.py:67` |

### Power Update Logic

- Net power = generation − consumption (`resources.py:87`)
- Energy delta = net_power × dt_hours (`resources.py:88`)
- Battery clamped to [0, capacity] (`resources.py:91–93`)
- Power failure: generation × (1 − reduction) (`resources.py:78`)
- Heating standby: 0.5 kW when no zone < 20°C (`resources.py:62`)

---

## 6. Solar Generation

| Parameter | Value | Source |
|-----------|-------|--------|
| Panel area | 50 m² | `resources.py:51` |
| Base efficiency | 0.20 | `resources.py:52` |
| Effective efficiency | 0.20 × panel_efficiency | `resources.py:52` (degradation factor) |
| Initial panel_efficiency | 1.0 | `state.py:71` |
| Formula | `irradiance × 50 × (0.20 × panel_eff) / 1000` kW | `resources.py:53` |

**Note:** `panel_efficiency` degrades with dust accumulation (reduced by dust storms). This is separate from the Beer-Lambert irradiance attenuation.

---

## 7. Crop Database (9 Crops)

### Growth Parameters

| Crop | Days to Harvest | Yield (g/m²/day) | Water (L/m²/day) | Temp Range (°C) | Optimal PAR | pH Range | Power (kW/m²) |
|------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Lettuce | 35 | 20.0 | 0.4 | 18–24 | 300 | 5.5–6.5 | 0.15 |
| Kale | 55 | 15.0 | 0.5 | 15–22 | 350 | 6.0–7.0 | 0.18 |
| Spinach | 40 | 18.0 | 0.4 | 16–22 | 300 | 6.0–7.0 | 0.15 |
| Basil | 25 | 12.0 | 0.3 | 20–28 | 350 | 5.5–6.5 | 0.15 |
| Tomato | 70 | 25.0 | 0.7 | 20–26 | 450 | 5.5–6.5 | 0.20 |
| Pepper | 80 | 20.0 | 0.6 | 21–27 | 450 | 5.5–6.5 | 0.20 |
| Radish | 28 | 22.0 | 0.3 | 15–22 | 250 | 6.0–7.0 | 0.12 |
| Soybean | 70 | 12.0 | 0.6 | 20–28 | 400 | 5.8–6.5 | 0.18 |
| Microgreens | 10 | 30.0 | 0.3 | 18–24 | 250 | 5.5–6.5 | 0.12 |

Source: `crops.py:11–228`

### Nutritional Profiles (per 100g edible weight)

| Crop | kcal | Protein (g) | Fat (g) | Fiber (g) | Vit C (mg) | Vit K (µg) | Folate (µg) | Ca (mg) | Fe (mg) | K (mg) | Vit A (µg RAE) |
|------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Lettuce | 17 | 1.2 | 0.3 | 2.1 | 24 | 126 | 136 | 33 | 0.9 | 247 | 436 |
| Kale | 49 | 4.3 | 0.9 | 3.6 | 120 | 817 | 141 | 150 | 1.5 | 491 | 500 |
| Spinach | 23 | 2.9 | 0.4 | 2.2 | 28 | 483 | 194 | 99 | 2.7 | 558 | 469 |
| Basil | 23 | 3.2 | 0.6 | 1.6 | 18 | 415 | 68 | 177 | 3.2 | 295 | 264 |
| Tomato | 18 | 0.9 | 0.2 | 1.2 | 14 | 7.9 | 15 | 10 | 0.3 | 237 | 42 |
| Pepper | 31 | 1.0 | 0.3 | 2.1 | 128 | 4.9 | 46 | 7 | 0.4 | 211 | 157 |
| Radish | 16 | 0.7 | 0.1 | 1.6 | 15 | 1.3 | 25 | 25 | 0.3 | 233 | 0 |
| Soybean | 147 | 12.9 | 6.8 | 4.2 | 6 | 33 | 165 | 145 | 3.5 | 539 | 9 |
| Microgreens | 31 | 3.0 | 0.5 | 2.5 | 60 | 300 | 80 | 50 | 2.0 | 350 | 200 |

Source: `crops.py` — USDA approximate values (microgreens estimated)

---

## 8. Growth Model

### Logistic Curve

```
biomass_fraction = K / (1 + e^(-steepness × (t - t_half)))
```

| Parameter | Value | Source |
|-----------|-------|--------|
| K (max capacity) | 1.0 (normalized) | `crops.py:236` |
| t_half | `days_to_harvest × 0.5` | `crops.py:292` |
| steepness | 0.15 | `crops.py:231` default |

Source: `crops.py:231–239`

### Biomass Increment Formula

```
increment = peak_yield × area_per_crop × growth_rate_fraction × days_to_harvest × stress
```

Where `growth_rate_fraction = logistic(t + dt) − logistic(t)` and `area_per_crop = zone_area / num_crops_in_zone`.

Source: `crops.py:276–308`

### Stress Multipliers

All stress factors multiply together (0.0–1.0 range). Source: `crops.py:242–273`

| Factor | Optimal | Formula when stressed |
|--------|---------|----------------------|
| Temperature | Within crop's min–max range → 1.0 | `max(0, 1 − 0.1 × degrees_outside_range)` |
| Light (PAR) | ≥ 80% of crop's optimal PAR → 1.0 | `max(0.1, actual_par / (optimal_par × 0.8))` |
| Water | Available → 1.0 | Not available → 0.3 |
| Health | 100% → 1.0 | `health / 100` |

**Temperature stress kills at 10°C outside optimal range** (stress = 0). **No light** gives minimum stress of 0.1 (not 0).

---

## 9. Nutrition Requirements

Per astronaut per day (approximate NASA values). Source: `config.py:26–37`

| Nutrient | Per Astronaut | Crew Total (×4) | Unit |
|----------|:-:|:-:|------|
| Calories | 2800 | 11200 | kcal |
| Protein | 70 | 280 | g |
| Fat | 70 | 280 | g |
| Fiber | 25 | 100 | g |
| Vitamin C | 90 | 360 | mg |
| Vitamin K | 120 | 480 | µg |
| Folate | 400 | 1600 | µg |
| Calcium | 1200 | 4800 | mg |
| Iron | 8 | 32 | mg |
| Potassium | 3400 | 13600 | mg |
| Vitamin A | 900 | 3600 | µg RAE |

**Realism:** NASA ISS dietary requirements specify 2700–3200 kcal/day depending on activity. The 1200 mg calcium is specifically elevated for spaceflight to counteract bone density loss. These values are accurate.

---

## 10. Water System

| Parameter | Value | Unit | Source |
|-----------|-------|------|--------|
| Initial reservoir | 1000 | L | `config.py:22` |
| Recycling efficiency | 0.90 (90%) | — | `config.py:23` |
| Default irrigation rate | 0.5 | L/hr | `state.py:55` |
| Irrigation rate range | 0–10 | L/hr | `engine.py:207` (validation) |

### Water Consumption Formula

```python
# resources.py:20-33
for each non-quarantined zone:
    irrigation_factor = zone.irrigation_rate / 0.5   # relative to default
    for each living crop:
        area_per_crop = zone.area / num_crops
        consumption = crop.water_use_L_per_m2_per_day × area_per_crop × (dt / 24)
        total += consumption × irrigation_factor
```

### Net Water Loss

```
net_loss = consumed × (1 − recycling_efficiency)
```

At 90% recycling, only 10% of consumed water is actually lost from the reservoir.

**Typical consumption per tick (6h):** With 50 m² of crops averaging 0.45 L/m²/day: `0.45 × 50 × (6/24) = 5.6 L consumed → 0.56 L net loss per tick`.

---

## 11. Temperature & Thermal Dynamics

Source: `environment.py:56–80`

| Parameter | Value | Unit |
|-----------|-------|------|
| Drift rate toward external | 0.5 | °C/hour |
| Heating effect | 0.8 | °C per kW per hour (toward target) |
| Temperature clamp | [5, 40] | °C |
| Heating power (active) | 4.0 | kW (`config.py:60`) |
| Heating power (sacrifice mode) | 0.0 | kW (`engine.py:113`) |

### Drift Formula

```python
drift = 0.5 × dt × (external − current) / max(|external − current|, 1.0)
```

This normalizes drift direction while capping at 0.5°C/hour regardless of temperature difference.

### Heating Effect

```python
heating_effect = min(heating_kw × 0.8 × dt, target − current)
```

At 4.0 kW, heating adds up to `4.0 × 0.8 × 6 = 19.2°C` per tick (capped by target).

### Priority-Based Temperature Adjustments

| Priority | Setpoint Adjustment | Source |
|----------|-------------------|--------|
| normal | No change | `engine.py:84` |
| high | No change | `engine.py:84` |
| low | −2°C | `engine.py:86` |
| hibernate | −5°C, lights off | `engine.py:88` |
| sacrifice | 5°C minimum, lights off, no heating | `engine.py:92–93, 113` |

---

## 12. Humidity Dynamics

Source: `environment.py:83–96`

| Parameter | Value | Unit |
|-----------|-------|------|
| Irrigation humidity effect | 0.5 per irrigating zone | % per hour |
| Dehumidification rate | 0.3 | fraction per hour toward target |
| Humidity clamp | [30, 95] | % |
| Humidity target | 70 | % (`config.py:17`) |

### Formula

```python
irrigation_effect = num_zones_irrigating × 0.5 × dt
correction = 0.3 × dt × (target − current)
new = current + irrigation_effect + correction
```

---

## 13. CO2 Dynamics

Source: `environment.py:99–122`

### Daytime (Photosynthesis)

| Parameter | Value | Unit |
|-----------|-------|------|
| CO2 consumption per active zone | 15.0 | ppm per hour |
| Mars atmosphere intake rate | 0.5 | fraction per hour toward target |

```python
consumption = num_zones × 15.0 × dt
intake = 0.5 × dt × (target − current + consumption)
```

### Nighttime (Respiration)

| Parameter | Value | Unit |
|-----------|-------|------|
| CO2 production per active zone | 3.0 | ppm per hour |
| Correction rate | 0.2 | fraction per hour toward target |

### Clamp: [300, 2500] ppm

**Note:** The Mars atmosphere auto-intake valve is a major simplification — the 95.3% CO2 atmosphere provides essentially unlimited CO2 supply, which is physically realistic.

---

## 14. Nutrient Solution

Source: `resources.py:96–109`

| Parameter | Value | Unit |
|-----------|-------|------|
| Initial pH | 6.0 | — (`state.py:65`) |
| pH drift rate | 0.01 per active zone | per 6h |
| pH max clamp | 7.5 | — |
| Initial EC | 2.0 | mS/cm (`state.py:66`) |
| EC consumption rate | 0.005 per active zone | per 6h |
| EC min clamp | 0.5 | mS/cm |

### pH Drift Formula

```python
ph_drift = 0.01 × active_zones × (dt / 6)
new_ph = min(7.5, current_ph + ph_drift)
```

### EC Consumption Formula

```python
ec_loss = 0.005 × active_zones × (dt / 6)
new_ec = max(0.5, current_ec - ec_loss)
```

---

## 15. Sensor Noise & Failures

Source: `config.py:44–52`, `sensors.py`

### Noise (Gaussian, std deviation)

| Sensor | Noise Std | Unit | Source |
|--------|:-:|------|--------|
| Temperature | 0.5 | °C | `config.py:45` |
| Humidity | 2.0 | % | `config.py:46` |
| CO2 | 20.0 | ppm | `config.py:47` |
| PAR | 10.0 | µmol/m²/s | `config.py:48` |
| pH | 0.1 | — | `config.py:49` |
| EC | 0.05 | mS/cm | `config.py:50` |
| Water level | 5.0 | L | `sensors.py:147` (hardcoded) |
| Battery | 1.0 | % | `sensors.py:155` (hardcoded) |

### Failure Model

| Parameter | Value | Source |
|-----------|-------|--------|
| Failure probability | 0.02 per reading | `config.py:51` |
| Max staleness | 2 ticks | `config.py:52` |
| Default failure duration | 10 ticks | `sensors.py:37` |

When a sensor fails, it returns `None` (offline). Failures decrement by 1 each tick (`sensors.py:56–64`).

### Valid Sensor Names

`temperature`, `humidity`, `co2`, `par`, `health`, `biomass`, `water_level`, `ph`, `ec`, `battery`

Source: `events.py:115`

---

## 16. Events

### Dust Storm

Source: `events.py:32–69`

| Parameter | Regional | Global |
|-----------|----------|--------|
| Opacity tau range | 2.0–4.0 | 4.0–5.5 |
| Duration range (sols) | 7–21 | 30–90 |
| Storm end | decrements 1 sol at tick 0 of each sol | same |
| Post-storm tau | 0.5 (normal) | same |

**Realism:** Mars dust storms range from regional (tau 1–3, days to weeks) to planet-encircling (tau 4–11, months). The 2007 global storm reached tau ~4.7. Values are realistic.

### Disease Outbreak

Source: `events.py:72–93`

| Parameter | Value |
|-----------|-------|
| Health damage | 7.0 per tick (per 6h) |
| Clearing condition | zone quarantined OR all crops dead |
| Default disease type | `pythium_root_rot` |

### Power Failure

Source: `events.py:96–112`

| Parameter | Value |
|-----------|-------|
| Default reduction | 50% of generation |
| Recovery rate | 5% per sol (at tick 0) |
| Recovery formula | reduction − 0.05 per sol until ≤ 0 |

### Sensor Failure (Event-Triggered)

Source: `events.py:118–146`

| Parameter | Value |
|-----------|-------|
| Default duration | 10 ticks |
| Minimum duration | 1 tick |

### Crop Failure

Source: `events.py:149–170`

Sets crop health to 0 for specified crop(s) in a zone. If no crop specified, kills all crops in the zone.

### Random Event Probabilities

| Event | Probability | Unit | Source |
|-------|:-:|------|--------|
| Dust storm | 0.005 | per sol | `config.py:41` |
| Disease | 0.002 | per sol | `config.py:42` |

**Note:** These probabilities are defined in config but the random event triggering is handled by the agent/API layer, not automatically in `_tick_once()`.

---

## 17. Zone Configuration

### Default Layout

| Zone | Crops | Source |
|------|-------|--------|
| A | Lettuce, Kale | `state.py:112` |
| B | Spinach, Basil | `state.py:113` |
| C | Tomato | `state.py:114` |
| D | Pepper, Radish | `state.py:115` |
| E | Soybean | `state.py:116` |
| F | Microgreens | `state.py:117` |

### Zone Defaults

| Parameter | Value | Source |
|-----------|-------|--------|
| Area | 8.33 m² | `config.py:56` |
| Temperature | 22°C (target) | `state.py:48` |
| Humidity | 70% | `state.py:49` |
| CO2 | 1200 ppm | `state.py:50` |
| PAR | 400 µmol/m²/s | `state.py:51` |
| Irrigation rate | 0.5 L/hr | `state.py:55` |
| Lighting | On | `state.py:56` |
| Priority | "normal" | `state.py:58` |
| Quarantined | False | `state.py:57` |

### Priority System

| Priority | Effect |
|----------|--------|
| `normal` | Standard operation |
| `high` | Lights stay on at night |
| `low` | Temperature setpoint −2°C |
| `hibernate` | Temperature setpoint −5°C, lights forced off |
| `sacrifice` | Minimum temp (5°C), lights off, no heating |

Source: `engine.py:84–94`

### Microgreens Deployment

| Parameter | Value | Source |
|-----------|-------|--------|
| Max deployments | 3 per zone | `engine.py:301` |
| Target zone | F (default) | `engine.py:297` |

---

## 18. Simulation Timing

| Parameter | Value | Source |
|-----------|-------|--------|
| Tick duration | 6 hours | `config.py:40` |
| Sol length | 24.62 hours | `config.py:9` |
| Ticks per sol | ~4.103 | 24.62 / 6 |
| Daytime hours | ~3.0 to ~21.0 (18h) | `environment.py:25` |
| Solar hours | 5.0 to 19.5 (14.5h) | `environment.py:36` |
| Mission ticks | ~1847 | 450 sols × 4.103 |

### Day/Night Determination

```python
is_daytime = 3.0 < hour_of_sol < 21.0    # environment.py:25
```

Note: "daytime" (18h) is wider than "solar hours" (14.5h). The first/last ~2.5h of daytime have no solar generation but lighting may still be on.

### Growth Stage Thresholds

| Progress (days/days_to_harvest) | Stage |
|---------------------------------|-------|
| < 0.20 | Seedling |
| 0.20–0.50 | Vegetative |
| 0.50–0.70 | Flowering |
| 0.70–0.95 | Fruiting |
| ≥ 0.95 | Mature |

Source: `engine.py:144–154`

---

## 19. Initial State Snapshot

Values at tick 0 (before any simulation step). Source: `state.py`

### Environment

| Field | Value |
|-------|-------|
| Sol | 1 |
| Tick | 0 |
| Is daytime | True |
| External temp | −60°C |
| Solar irradiance | 590 W/m² |
| Dust opacity tau | 0.5 |
| Pressure | 101.3 kPa |
| O2 | 21% |
| Dust storm | Inactive |
| Disease | Inactive |
| Power failure | Inactive |

### Resources

| Field | Value |
|-------|-------|
| Water reservoir | 1000 L |
| Recycling efficiency | 0.90 |
| Nutrient pH | 6.0 |
| Nutrient EC | 2.0 mS/cm |
| Power generation | 15.0 kW (display default, recalculated on first tick) |
| Power consumption | 12.0 kW (display default, recalculated on first tick) |
| Battery charge | 80 kWh (80%) |
| Battery capacity | 100 kWh |
| Solar panel efficiency | 1.0 |

### All Crops

| Field | Value |
|-------|-------|
| Growth stage | Seedling |
| Days planted | 0 |
| Health | 100% |
| Biomass | 0 g |

---

## 20. Optimization System

Source: `nutrition.py:88–195`

The `optimize_crop_allocation` function uses **scipy.optimize.linprog** with a minimax formulation:

| Parameter | Default | Source |
|-----------|---------|--------|
| Available area | 50 m² | `config.py:4` via `GROWING_AREA_M2` |
| Water budget (daily) | 100 L | `nutrition.py:101` — `GREENHOUSE_WATER_BUDGET_L × 0.1` |
| Power budget | 20 kW | `config.py:24` via `GREENHOUSE_POWER_BUDGET_KW` |

**Objective:** Maximize the minimum nutritional coverage ratio across all tracked nutrients.

**Constraints:** Total area ≤ budget, total water ≤ budget, total power ≤ budget.

---

## 21. Event Log

| Parameter | Value | Source |
|-----------|-------|--------|
| Max entries | 1000 | `engine.py:352` |
| Pruning | Keeps last 1000 | `engine.py:352` |

Each entry contains: sol, tick, event_type, description, affected_zones, params.
