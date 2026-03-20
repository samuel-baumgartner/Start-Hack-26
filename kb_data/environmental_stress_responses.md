# Environmental Stress Responses for FLORA Greenhouse Crops

Sources: CEA research literature, NASA BPC environmental trials, USDA crop stress databases.

---

## Temperature Stress Thresholds

### Per-Crop Temperature Limits

| Crop | Growth Stops | Damage Begins | Lethal | Optimal Range | Heat Stress |
|------|:---:|:---:|:---:|:---:|:---:|
| Dwarf Wheat (Apogee) | <8°C | <5°C (frost) | <-2°C | 22-24°C | >32°C (grain sterility) |
| Sweet Potato | <15°C | <10°C | <5°C | 24-30°C | >35°C (tuber cracking) |
| Soybean | <12°C | <8°C | <2°C | 25-30°C | >35°C (flower abort) |
| Kale | <4°C (tolerant) | <-2°C | <-8°C | 15-21°C | >28°C (bolting) |
| Spinach | <5°C | <-2°C | <-6°C | 15-20°C | >25°C (bolting) |
| Cherry Tomato | <10°C | <5°C | <0°C | 20-26°C | >32°C (pollen sterility) |
| Radish | <5°C | <-2°C | <-6°C | 15-22°C | >27°C (bolting, pithy) |
| Microgreens | <10°C | <5°C | <0°C | 18-24°C | >30°C (leggy growth) |
| Pepper | <12°C | <8°C | <2°C | 21-29°C | >35°C (flower drop) |
| Tomato | <10°C | <5°C | <0°C | 21-27°C | >35°C (pollen sterility) |
| Dry Beans | <12°C | <8°C | <2°C | 21-27°C | >32°C (flower drop) |

**Critical greenhouse threshold: NEVER below 5°C.** At 5°C, 8 of 11 non-cold-tolerant crops suffer damage. Only kale, spinach, and radish survive brief exposure below 5°C.

**Critical upper threshold: NEVER above 40°C.** All crops suffer irreversible damage above 40°C. Most experience severe stress above 35°C.

### Cold Stress Recovery

| Severity | Duration | Recovery Time | Yield Impact |
|----------|----------|:---:|:---:|
| Mild (growth slows) | <6 hours below optimum | 1-2 ticks | <5% yield loss |
| Moderate (growth stops) | 6-24 hours below growth stop | 3-5 ticks | 10-30% yield loss |
| Severe (tissue damage) | Any time below damage threshold | 7-14 ticks or unrecoverable | 30-80% yield loss |
| Lethal | Below lethal threshold | No recovery | 100% loss |

**Recovery protocol for cold exposure:**
1. Gradually raise temperature (2°C per hour, not sudden)
2. Reduce irrigation by 30% — stressed roots absorb less water
3. Reduce lighting intensity by 25% — stressed leaves photosynthesize less
4. Monitor leaf_color_index — recovery shows as gradual NDVI increase over 3-7 ticks
5. Do NOT fertilize during recovery — salt stress compounds cold damage

### Heat Stress Recovery

| Severity | Duration | Recovery Time | Yield Impact |
|----------|----------|:---:|:---:|
| Mild (reduced photosynthesis) | <6 hours above 30°C | 1 tick | <5% yield loss |
| Moderate (flower/fruit abort) | 6-24 hours above 32°C | 5-10 ticks | 15-40% yield loss (fruiting crops) |
| Severe (protein denaturation) | Any time above 38°C | 10+ ticks or unrecoverable | 40-90% yield loss |
| Lethal | >40°C sustained | No recovery | 100% loss |

**Heat stress protocol:**
1. Increase ventilation / reduce heating immediately
2. Increase irrigation by 20-30% — evaporative cooling helps
3. Reduce lighting intensity (LEDs add heat load)
4. Fruiting crops (tomato, pepper, cherry tomato): flowers pollinated during heat stress produce no fruit — accept 1-2 week gap in fruit production

---

## Light Deficiency Responses

### Minimum PAR for Survival vs Growth

| Crop | Minimum Survival PAR | Minimum Growth PAR | Optimal PAR | Response to Deficiency |
|------|:---:|:---:|:---:|---|
| Dwarf Wheat | 100 µmol | 250 µmol | 400-800 µmol | Etiolation, thin stems, no grain fill |
| Sweet Potato | 100 µmol | 200 µmol | 300-500 µmol | Reduced tuber formation, leggy vines |
| Soybean | 100 µmol | 250 µmol | 400-600 µmol | Reduced pod set, tall weak stems |
| Kale | 50 µmol | 150 µmol | 200-400 µmol | Reduced leaf thickness, lower nutrients |
| Spinach | 50 µmol | 100 µmol | 200-400 µmol | Thinner leaves but still edible |
| Cherry Tomato | 100 µmol | 200 µmol | 300-500 µmol | Reduced fruit set, leggy growth |
| Radish | 75 µmol | 150 µmol | 200-400 µmol | Slow root development, all leaf |
| Microgreens | 50 µmol | 75 µmol | 100-300 µmol | Still viable at low light (shade tolerant) |
| Pepper | 100 µmol | 200 µmol | 300-500 µmol | Flower drop, no fruit |
| Tomato | 100 µmol | 250 µmol | 400-600 µmol | Very leggy, poor fruit set |
| Dry Beans | 100 µmol | 200 µmol | 300-500 µmol | Reduced pod formation |

### Dust Storm Light Management

During dust storms when solar power drops, allocate available LED power:

**Priority Tier 1 — Keep at 200+ µmol (survival + some growth):**
- Near-harvest crops (any zone) — protect investment
- Kale and Spinach — low light requirement, high nutritional value

**Priority Tier 2 — Keep at 100 µmol (survival only):**
- Mid-growth crops not near harvest
- Soybean (if in vegetative stage — can recover from light deficit)

**Priority Tier 3 — Can go to 0 (hibernate/sacrifice):**
- Seedlings (<14 days old) — replant after storm, faster than recovery
- Microgreens in early stage — 7-day restart after storm

**Light deficit duration tolerance:**
| Duration Without Adequate Light | Effect |
|:---:|---|
| 1-2 ticks (6-12 hours) | Minimal impact, full recovery |
| 3-6 ticks (18-36 hours) | Growth stalls, 1-2 tick recovery lag |
| 7-14 ticks (2-4 days) | Significant stress, etiolation begins, 3-7 tick recovery |
| >14 ticks (>4 days) | Permanent damage likely for fruiting crops, leafy greens may survive |

---

## Water Stress Responses

### Water Deficit

| Crop | Drought Tolerance | Time to Wilt | Time to Permanent Damage | Recovery Rate |
|------|:---:|:---:|:---:|:---:|
| Dwarf Wheat | Moderate | 12-18 hours | 36-48 hours | 70% recovery if <24h |
| Sweet Potato | Good | 24-36 hours | 72+ hours | 80% recovery if <36h |
| Soybean | Moderate | 12-18 hours | 36-48 hours | 60% recovery if <24h |
| Kale | Good | 18-24 hours | 48-72 hours | 85% recovery if <24h |
| Spinach | Poor | 6-12 hours | 18-24 hours | 50% recovery if <12h |
| Cherry Tomato | Moderate | 12-18 hours | 24-36 hours | 65% recovery if <18h |
| Radish | Moderate | 12-18 hours | 24-36 hours | 70% recovery (but pithy roots) |
| Microgreens | Poor | 4-8 hours | 12-18 hours | Low — restart is faster |
| Pepper | Moderate | 12-18 hours | 30-48 hours | 60% recovery, flower drop likely |
| Tomato | Moderate | 12-18 hours | 24-36 hours | 65% recovery if <18h |
| Dry Beans | Moderate | 12-18 hours | 36-48 hours | 60% recovery if <24h |

**Water stress recovery protocol:**
1. Resume irrigation at 75% normal rate (not full — stressed roots can't absorb full volume)
2. Ramp to 100% over 2-3 ticks
3. Reduce lighting by 20% during recovery (reduces transpiration demand)
4. Monitor growth_rate_anomaly — recovery shows as gradual return toward 0%

### Water Excess (Overwatering)

Hydroponic zones (B, C, D) are less susceptible to overwatering since oxygen is delivered through the nutrient solution. Soil Zone A is vulnerable:

- **Soil Zone A symptoms:** root oxygen deprivation, yellowing lower leaves, growth_rate_anomaly -10 to -30%
- **Detection:** leaf_color_index drops, but water_quality_anomaly remains normal (distinguishes from disease)
- **Fix:** Reduce irrigation rate by 30-50%, improve drainage, reduce humidity

**Critical reservoir threshold: NEVER below 50 liters.** Below 50L, pump cavitation occurs and irrigation fails across all zones simultaneously. This is an unrecoverable cascading failure.

---

## CO₂ Enrichment Benefits

### Mars Atmosphere Advantage

Mars atmosphere is 95.3% CO₂. While surface pressure is low (610 Pa), extracting and pressurizing CO₂ for greenhouse use is straightforward with ISRU (In-Situ Resource Utilization) equipment.

| Crop | Yield Boost at 800 ppm | Yield Boost at 1200 ppm | Optimal CO₂ | Notes |
|------|:---:|:---:|:---:|---|
| Dwarf Wheat (Apogee) | +20% | +35-40% | 1200 ppm | Bred for high-CO₂ response |
| Sweet Potato | +15% | +25-35% | 1000 ppm | Tuber mass increase |
| Soybean | +20% | +30-40% | 1200 ppm | Strong responder, more pods |
| Kale | +10% | +15-20% | 800 ppm | Moderate responder |
| Spinach | +15% | +20-30% | 1000 ppm | Good responder |
| Cherry Tomato | +20% | +25-35% | 1000 ppm | More fruit per plant |
| Radish | +10% | +15-20% | 800 ppm | Root mass increase |
| Microgreens | +10% | +15% | 800 ppm | Faster growth |
| Pepper | +10% | +15-20% | 1000 ppm | Moderate responder |
| Tomato | +20% | +30-40% | 1200 ppm | Strong responder |
| Dry Beans | +10% | +15-25% | 1000 ppm | Moderate responder |

**All 16 crops are C3 photosynthesis plants** — they ALL benefit from elevated CO₂ above Earth ambient (420 ppm). C3 plants have not yet saturated their CO₂ fixation capacity at ambient levels, so enrichment directly increases photosynthesis rate.

**Diminishing returns above 1200 ppm.** Beyond 1200 ppm, stomatal closure can reduce transpiration and nutrient uptake. Do not exceed 1500 ppm.

---

## Dust Storm Impact Analysis

### Impact by Crop Growth Stage

Dust storms reduce available solar power, which means reduced LED lighting and potential heating challenges.

| Growth Stage | Days into Cycle | Investment Lost if Sacrificed | Replant Time to Harvest | Priority |
|-------------|:---:|:---:|:---:|:---:|
| Seedling | 0-14 | LOW | Full cycle | SACRIFICE first |
| Early Vegetative | 14-30 | LOW-MODERATE | 70-85% of cycle | SACRIFICE or HIBERNATE |
| Late Vegetative | 30-50 | MODERATE | 50-70% of cycle | HIBERNATE |
| Flowering | 50-70 | HIGH | Near full cycle | PROTECT if possible |
| Fruiting/Bulking | 70-90+ | VERY HIGH | Near full cycle | PROTECT — highest priority |
| Near Harvest | 85-100% | HIGHEST | Full cycle | PROTECT AT ALL COSTS |

### Storm Duration Impact Matrix

| Storm Duration | Seedlings | Vegetative | Flowering | Near Harvest |
|:---:|:---:|:---:|:---:|:---:|
| 1-2 ticks (6-12h) | Survive | Survive | Survive | Survive |
| 3-6 ticks (18-36h) | Stress | Survive | Stress | Survive |
| 7-14 ticks (2-4 days) | Die | Stress | Damage | Survive (protect) |
| 15-28 ticks (4-7 days) | Dead | Damage | Major damage | Stress |
| >28 ticks (>7 days) | Dead | Dead | Dead/severe | Damage |

### Resource Allocation During Dust Storms

**Power triage order:**
1. Heating (prevent freeze — CRITICAL)
2. Water pumps (prevent dehydration — CRITICAL)
3. Sensors (maintain awareness — CRITICAL)
4. LED lighting for PROTECT zones (near-harvest crops)
5. LED lighting for HIBERNATE zones (reduced intensity)
6. SACRIFICE zones get zero power allocation

**Water conservation during storms:**
- Reduce irrigation by 30-50% for hibernated zones (less light = less transpiration)
- Maintain full irrigation for protected zones
- Zero irrigation for sacrificed zones
- Monitor reservoir level — storms may outlast expectations

**Post-storm recovery priority:**
1. Assess all zones — read sensors immediately
2. Resume lighting for hibernated zones at 50%, ramp to 100% over 2 ticks
3. Resume irrigation for hibernated zones at 75%, ramp to 100% over 1 tick
4. Replant sacrificed zones starting with shortest-cycle crops (microgreens → radish)
5. Evaluate nutrition gap from lost crops — deploy microgreens if coverage drops below 60%
