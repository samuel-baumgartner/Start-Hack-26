# Mission Parameters — NASA/SpaceX Research Reference

> **Research compiled 2026-03-19** from NASA DRA 5.0, BVAD Rev 2, JSC-67378, Wheeler et al. (2008), Poulet et al. (2021), ISS ECLSS data, SpaceX Starship specs, and Syngenta hackathon KB.
>
> **Organizer clarification:** 80% of nutritional value must come from the greenhouse. Nutrients that are impractical to grow (fats, B12, vitamin D, omega-3s) can be brought from Earth as packaged supplements.

---

## 1. Mission Framing

| Parameter | Value | Source |
|-----------|-------|--------|
| Crew size | 4 astronauts | Challenge spec |
| Surface stay | 450 sols (~462 Earth days) | Challenge spec |
| Growing area | 50 m² (6 zones) | Challenge spec |
| Per-person growing area | 12.5 m²/person | 50 ÷ 4 |
| Full caloric self-sufficiency area | 40–50 m²/person | Wheeler, NASA BLSS studies |
| **Greenhouse role** | **80% of nutritional value** | Organizer clarification |
| Brought from Earth | Fats, B12, vitamin D, omega-3 (DHA/EPA), shelf-stable calorie supplements | Organizer clarification |

### What "80% nutritional value" means

The greenhouse must provide 80% coverage across the tracked nutrients. Nutrients the greenhouse **cannot** realistically produce are excluded from the 80% target:

**Greenhouse provides (target 80%+ coverage):**
- Calories (via potatoes, wheat, legumes, greens)
- Protein (legumes, soy, wheat)
- Fiber
- Vitamin C (degrades fastest in storage — greenhouse is the only reliable source)
- Vitamin K (leafy greens only)
- Folate (degrades in storage)
- Vitamin A (beta-carotene from greens and sweet potatoes)
- Iron (non-heme, from greens and legumes)
- Calcium (greens, legumes)
- Potassium (potatoes, greens, legumes)

**Brought from Earth (packaged/supplemented):**
- Fats/oils (olive oil, fish oil — no viable greenhouse oil crop in 50 m²)
- Vitamin B12 (no plant source exists)
- Vitamin D (supplements; mushrooms + UV-B produce D₂ but unreliably)
- Omega-3 DHA/EPA (fish oil or algae supplements)
- Supplemental calories if greenhouse falls short (MRE-style rations)

---

## 2. Power System — Nuclear + Solar Hybrid

NASA DRA 5.0 baselined nuclear fission as the primary Mars surface power source. Solar is a supplement, not a co-primary.

### Nuclear Baseline

| Parameter | Value | Source |
|-----------|-------|--------|
| Reactor type | Kilopower (fission, U-235) | NASA STMD |
| Per-unit output | 10 kWe | NASA Kilopower project |
| DRA 5.0 baseline | 4 units = **40 kWe continuous** | DRA 5.0 power analysis |
| Mass per unit | ~1,500 kg | NASA NTRS |
| Total system mass | ~6,000 kg (4 units) | NASA NTRS |
| Operational life | 10+ years | NASA FSP spec |
| Works at night | Yes — continuous | — |
| Affected by dust storms | No | — |

### Solar Supplement

| Parameter | Value | Source |
|-----------|-------|--------|
| Mars peak irradiance | 590 W/m² | Orbital average at equator noon |
| Panel area | 50 m² | Current sim value |
| Panel efficiency | 20% | Current sim value |
| Peak generation (no dust) | 5.9 kW | 590 × 50 × 0.20 / 1000 |
| Dust attenuation (tau=0.5) | ×0.607 (Beer-Lambert) | Realistic clear-day Mars |
| Realistic peak gen | ~3.6 kW | 5.9 × 0.607 |
| Solar window | ~14.5 hours/sol (5h–19.5h) | Sinusoidal model |
| Average generation over sol | ~1.8 kW | Integral of sin × attenuation |
| Dust degradation rate | 0.14–0.28% per sol | MER / Pathfinder data |
| Global dust storm loss | 80–95% | Mars observation data |

### Combined Power Budget

| System | kW (continuous) | Source |
|--------|:-:|--------|
| **Nuclear baseline** | **15–20** | Subset of 40 kWe allocated to greenhouse habitat |
| **Solar supplement (day avg)** | **~1.8** | 50 m² panels, tau=0.5 |
| **Total available** | **~17–22 kW avg** | Nuclear + solar |

### Battery / Energy Storage

| Parameter | Value | Source |
|-----------|-------|--------|
| Role | Load smoothing, not overnight survival | Nuclear covers baseload |
| Capacity | **500 kWh** | Sized for transient peaks + partial backup |
| Initial charge | 80% (400 kWh) | Conservative startup |
| Mass (at 130 Wh/kg Li-ion) | ~3,850 kg | Tesla Megapack density |
| Mass (at 200 Wh/kg solid-state) | ~2,500 kg | Near-future projection |

With nuclear carrying the baseload, the battery doesn't need to survive an entire night — it only buffers peak-demand transients (e.g., all lights on + heating spike + pumps).

---

## 3. Power Consumption — Realistic Breakdown

### LED Grow Lights

Modern horticultural LED efficacy: **2.5–3.5 µmol/J** (Samsung LM301H/B class).

Formula: `Power (kW) = (PAR × Area) / (Efficacy × 1000)`

| Crop Type | Target PAR (µmol/m²/s) | Area Assumption | Efficacy | Power |
|-----------|:-:|:-:|:-:|:-:|
| Leafy greens (lettuce, kale, spinach) | 200–250 | 20 m² | 2.8 µmol/J | **1.4–1.8 kW** |
| Herbs (basil) | 200–300 | 5 m² | 2.8 µmol/J | **0.4–0.5 kW** |
| Fruiting crops (tomato, pepper) | 400–500 | 10 m² | 2.8 µmol/J | **1.4–1.8 kW** |
| Staple crops (potato, soy, wheat) | 300–500 | 15 m² | 2.8 µmol/J | **1.6–2.7 kW** |
| **Total lighting (50 m²)** | mixed | 50 m² | 2.8 µmol/J | **~5 kW peak** |

Lights run 16–18 hours/sol → average: **~3.5 kW**.

**Compare to current sim:** 1.5 kW × 6 zones = 9.0 kW. This is **nearly 2× too high** because it assumes old HPS-era power draw, not modern LEDs. Realistic per-zone lighting: **~0.5–0.9 kW** depending on crop.

### Heating

| Insulation Type | Heat Loss (W/m²) at ΔT=80°C | Greenhouse (100 m² shell) | Source |
|-----------------|:-:|:-:|--------|
| Aerogel (50mm) | 10–20 | **1.0–2.0 kW** | Marspedia |
| Fiberglass (50mm) | 20–40 | 2.0–4.0 kW | Marspedia |
| Foam (50mm) | 40–80 | 4.0–8.0 kW | Marspedia |
| **Assumed (aerogel)** | **~15** | **~1.5 kW avg** | Conservative aerogel |

During dust storms (ΔT up to 100–120°C): **2–4 kW peak**.

**Compare to current sim:** 4.0 kW active heating — **plausible for foam insulation**, high for aerogel. With good insulation, 1.5–2.5 kW is realistic.

### Other Subsystems

| System | kW | Source |
|--------|:-:|--------|
| Water pumps (recirculating hydro) | 0.3–0.5 | CEA industry data |
| Atmosphere management (CO₂ intake, dehumidifier, fans) | 0.5–1.0 | ISS ECLSS scaled |
| Sensors, controls, automation | 0.2–0.3 | Estimate |
| Life support (O₂ gen, CO₂ scrub, water recycling for crew) | **4–6** | ISS ECLSS: ~1.2 kW/person |
| **Total non-lighting, non-heating** | **~5.5–8 kW** | — |

### Summary: Realistic Power Budget

| Category | kW (avg) | kW (peak) |
|----------|:-:|:-:|
| LED lighting | 3.5 | 5.0 |
| Heating | 1.5 | 4.0 |
| Pumps + atmosphere | 1.0 | 1.5 |
| Sensors/controls | 0.3 | 0.3 |
| Crew life support | 5.0 | 6.0 |
| **Total** | **~11.3** | **~16.8** |
| **Available (nuclear + solar)** | **~18–22** | **~22+** |
| **Margin** | **+7 to +10 kW** | **+5 kW** |

**The power budget works with nuclear.** There's comfortable margin for normal operations and enough headroom for dust-storm crisis response (shift power from lights to heating).

---

## 4. Crop Data — NASA Measured Values

### Yields (NASA Biomass Production Chamber, Kennedy Space Center)

Source: Wheeler et al. 2008, "Crop productivities and radiation use efficiencies for bioregenerative life support."

All BPC yields measured at 1000–1200 ppm CO₂, hydroponic NFT, controlled lighting.

| Crop | Dry Mass (g/m²/day) | Fresh Weight (g/m²/day) | Water Content | Growth Cycle (days) |
|------|:-:|:-:|:-:|:-:|
| Wheat | 11.3 edible | ~13 (grain) | ~12% | 64–86 |
| Potato | 18.4 edible | **~92** (tuber) | ~80% | 90–105 |
| Tomato | 9.8 edible | **~163** (fruit) | ~94% | 60–100 (continuous) |
| Soybean | 6.0 edible | **~7** (dry seed) | ~10% | **90–97** |
| Lettuce | 7.1 edible | **~142** (leaf) | ~95% | 28–35 |
| Sweet potato | — | **~66** | ~75% | 100–120 |

### Crops NOT in BPC (CEA literature estimates)

| Crop | Est. Fresh Weight (g/m²/day) | Growth Cycle (days) |
|------|:-:|:-:|
| Kale | 10–18 | 50–65 |
| Spinach | 10–18 | 35–45 |
| Basil | 8–15 | 25–35 |
| Pepper | 15–25 | 70–100 |
| Radish | 15–25 | 25–30 |
| Microgreens | 20–40 | 7–14 |

### PAR Levels Used in NASA Studies

| Crop | PAR (µmol/m²/s) | Photoperiod |
|------|:-:|:-:|
| Wheat | 800–2000 | 16–20h |
| Potato | 400–800 | 12–24h |
| Soybean | 500–800 | 12–16h |
| Lettuce | 200–400 | 16–18h |
| Sweet potato | 400–840 | 16h |
| Tomato | 400–600 | 16–18h |
| ISS VEGGIE chamber | 320 | 16h |

**Syngenta recommends 150–250 µmol/m²/s for leafy crops** — conservative compared to NASA BPC but reasonable for a resource-constrained Mars mission.

---

## 5. Nutritional Requirements — NASA Standards

Source: NASA JSC-67378 "Nutritional Requirements for Exploration Missions up to 365 days" (2020).

### Per Astronaut Per Day

| Nutrient | NASA Standard | Our Current Sim | Correction |
|----------|:-:|:-:|:-:|
| Calories | 2700–3200 kcal | 2800 kcal | OK (within range) |
| Protein | **0.8–1.5 g/kg** (~96–144g for 80kg) | 70 g | **Increase to 100–110 g** |
| Fat | ~30% of kcal (~93g) | 70 g | **Brought from Earth (oils, supplements)** |
| Fiber | 25–35 g | 25 g | OK |
| Vitamin C | 90 mg | 90 mg | OK |
| Vitamin K | 90–120 µg | 120 µg | OK |
| Folate | 400 µg DFE | 400 µg | OK |
| Calcium | 1000–1200 mg | 1200 mg | OK (elevated for bone loss) |
| Iron | 8–11 mg | 8 mg | OK |
| Potassium | 3400–4700 mg | 3400 mg | OK |
| Vitamin A | 700–900 µg RAE | 900 µg | OK |

### What the Greenhouse Must Provide (80% target)

Crew daily totals (×4 astronauts) with 80% greenhouse coverage:

| Nutrient | Crew Total/Day | 80% Target | Greenhouse Must Produce |
|----------|:-:|:-:|:-:|
| Calories | 11,200 kcal | 8,960 kcal | **8,960 kcal/day** |
| Protein | 420 g (105/person) | 336 g | **336 g/day** |
| Fiber | 100 g | 80 g | 80 g/day |
| Vitamin C | 360 mg | 288 mg | 288 mg/day |
| Vitamin K | 480 µg | 384 µg | 384 µg/day |
| Folate | 1,600 µg | 1,280 µg | 1,280 µg/day |
| Calcium | 4,800 mg | 3,840 mg | 3,840 mg/day |
| Iron | 32 mg | 25.6 mg | 25.6 mg/day |
| Potassium | 13,600 mg | 10,880 mg | 10,880 mg/day |
| Vitamin A | 3,600 µg | 2,880 µg | 2,880 µg/day |

### Earth-Supplied Nutrients (excluded from 80% target)

| Nutrient | Daily Need | Source |
|----------|:-:|--------|
| Fat | ~370 g (crew total) | Olive oil, fish oil, nut butter |
| Vitamin B12 | 9.6 µg | Supplements (no plant source) |
| Vitamin D | 2400 IU (60 µg) | Supplements |
| Omega-3 (DHA/EPA) | 4–8 g | Fish oil capsules |
| Emergency calories | Variable | MRE-style rations |

---

## 6. Nutritional Profiles — Missing Crops (USDA FoodData Central)

### Potato (boiled, flesh & skin, per 100g)

| Nutrient | Value |
|----------|-------|
| Calories | 87 kcal |
| Protein | 1.9 g |
| Fat | 0.1 g |
| Fiber | 1.8 g |
| Vitamin C | 13 mg |
| Vitamin K | 2.1 µg |
| Folate | 10 µg |
| Calcium | 5 mg |
| Iron | 0.3 mg |
| Potassium | 379 mg |
| Vitamin A | 0 µg RAE |

**Mission role:** Caloric backbone. At 92 g/m²/day FW and 87 kcal/100g, one m² of potatoes produces ~80 kcal/day.

### Sweet Potato (baked, per 100g)

| Nutrient | Value |
|----------|-------|
| Calories | 90 kcal |
| Protein | 2.0 g |
| Fat | 0.15 g |
| Fiber | 3.3 g |
| Vitamin C | 19.6 mg |
| Vitamin K | 2.3 µg |
| Folate | 6 µg |
| Calcium | 38 mg |
| Iron | 0.7 mg |
| Potassium | 475 mg |
| Vitamin A | **961 µg RAE** |

**Mission role:** Vitamin A powerhouse + calories. A single m² provides almost the entire crew's daily vitamin A.

### Wheat (whole grain flour, per 100g)

| Nutrient | Value |
|----------|-------|
| Calories | 340 kcal |
| Protein | 13.2 g |
| Fat | 2.5 g |
| Fiber | 10.7 g |
| Vitamin C | 0 mg |
| Vitamin K | 1.9 µg |
| Folate | 44 µg |
| Calcium | 34 mg |
| Iron | 3.6 mg |
| Potassium | 363 mg |
| Vitamin A | 0 µg RAE |

**Mission role:** Highest caloric density (340 kcal/100g) + protein + fiber. But low yield (13 g/m²/day) and long cycle.

### Dry Beans (average of kidney/black/chickpea, per 100g cooked)

| Nutrient | Value |
|----------|-------|
| Calories | 141 kcal |
| Protein | 8.8 g |
| Fat | 1.2 g |
| Fiber | 7.9 g |
| Vitamin C | 1 mg |
| Vitamin K | 3.5 µg |
| Folate | 130 µg |
| Calcium | 46 mg |
| Iron | 2.6 mg |
| Potassium | 350 mg |
| Vitamin A | 0 µg RAE |

**Mission role:** Protein security. Better protein density than soybean when cooked weight is considered.

---

## 7. Water System — NASA Data

| Parameter | Value | Source |
|-----------|-------|--------|
| ISS water recovery rate | **98%** | NASA 2023 milestone |
| Mars target | ≥95% | NASA BLSS |
| Crew drinking water | 2.0–2.8 L/person/day | BVAD Rev 2 |
| Crew total water use | 14–22 L/day (4 crew) | BVAD Rev 2 |
| Greenhouse evapotranspiration | 4–8 L/m²/day (200–400 L/day for 50 m²) | CEA literature |
| Recovery from transpiration | 95–98% in closed greenhouse | Condensation + dehumidification |
| Net daily water loss (greenhouse) | **4–20 L/day** | After recycling |
| Initial reservoir | 500–1,000 L | Reasonable for startup |
| Hydroponic lettuce water use | ~20 L/kg edible FW | Barbosa et al. 2015 |

---

## 8. Syngenta KB Crop Allocation Strategy

From `05_Human_Nutritional_Strategy.md`:

| Area Allocation | Percentage | Crops |
|-----------------|:-:|---------|
| Caloric backbone | 40–50% | Potatoes (+ wheat if added) |
| Protein security | 20–30% | Legumes (soy, beans/peas) |
| Micronutrient stabilizers | 15–20% | Leafy greens (lettuce, kale, spinach) |
| Diversity + morale | 5–10% | Radishes, herbs, microgreens |

**With our 6-zone setup (8.33 m² each):**

| Zone | Syngenta-Aligned Assignment | Role |
|------|----------------------------|------|
| A | Potato | Caloric backbone |
| B | Potato + Sweet Potato | Calories + Vitamin A |
| C | Soybean + Beans | Protein security |
| D | Lettuce + Kale + Spinach | Micronutrients |
| E | Tomato + Pepper | Vitamin C + diversity |
| F | Radish + Basil + Microgreens | Fast buffer + morale |

---

## 9. Corrections Needed in Simulation

### config.py Changes

| Constant | Current | Corrected | Rationale |
|----------|:-:|:-:|-----------|
| `DAILY_PROTEIN_G` | 70 | **105** | NASA JSC-67378: 1.2–1.5 g/kg × 80 kg |
| `BATTERY_CAPACITY_KWH` | 100 | **500** | Sized for load smoothing with nuclear |
| `POWER_LIGHTING_PER_ZONE_KW` | 1.5 | **0.8** | Modern LEDs at 2.8 µmol/J |
| `POWER_HEATING_KW` | 4.0 | **2.0** | Aerogel insulation assumed |
| `POWER_LIFE_SUPPORT_KW` | 3.0 | **5.0** | ISS ECLSS: ~1.2 kW/person × 4 |
| `GREENHOUSE_WATER_RECYCLE_EFFICIENCY` | 0.90 | **0.95** | NASA target for Mars |

### New Constants to Add

| Constant | Value | Rationale |
|----------|-------|-----------|
| `NUCLEAR_BASELINE_KW` | 15.0 | Subset of 40 kWe Kilopower allocation |
| `DAILY_FAT_G` | 93 | ~30% of 2800 kcal (Earth-supplied, excluded from greenhouse target) |
| `GREENHOUSE_NUTRITION_TARGET_PERCENT` | 0.80 | Organizer: 80% from greenhouse |

### crops.py Additions

| Crop | days_to_harvest | yield (g/m²/day) | water (L/m²/day) | temp range | PAR | kcal/100g |
|------|:-:|:-:|:-:|:-:|:-:|:-:|
| potato | 95 | 90.0 | 0.6 | 16–20°C | 500 | 87 |
| sweet_potato | 110 | 65.0 | 0.5 | 20–26°C | 500 | 90 |
| wheat | 75 | 13.0 | 0.4 | 18–24°C | 600 | 340 |
| dry_beans | 60 | 15.0 | 0.5 | 18–25°C | 400 | 141 |

### crops.py Corrections

| Crop | Field | Current | Corrected |
|------|-------|:-:|:-:|
| soybean | days_to_harvest | 70 | **93** |
| soybean | yield_per_m2_per_day | 12.0 | **7.0** |
| lettuce | optimal_par | 300 | **200** |
| kale | optimal_par | 350 | **250** |
| spinach | optimal_par | 300 | **200** |
| basil | optimal_par | 350 | **250** |

### resources.py: Nuclear Power Addition

The `compute_solar_power` function should be supplemented with nuclear baseline:

```
total_generation = nuclear_baseline_kw + solar_power_kw
```

Nuclear is constant (day/night, unaffected by dust). Solar adds on top during daytime.

---

## 10. Sources

- NASA DRA 5.0: Power Requirements — NTRS 20120012929
- NASA Kilopower Project — nasa.gov/kilopower
- NASA FSP 40 kWe Concept — NTRS 20220004670
- NASA BVAD Rev 2 (2022) — NTRS 20210024855
- NASA JSC-67378 Nutritional Requirements for Exploration Missions (2020)
- Wheeler et al. 2008, "Crop productivities and radiation use efficiencies" — *Adv. Space Res.*
- Poulet et al. 2021, "Optimized crop growth area composition" — *Life Sci. Space Res.*
- Barbosa et al. 2015, "Comparison of land, water, and energy requirements" — *Int J Environ Res Public Health*
- NASA ECLSS Technical Brief — nasa.gov OCHMO
- NASA ISS Water Recovery Milestone (2023) — nasa.gov
- Marspedia: Insulation, Greenhouse, Solar Panel articles
- Tesla Megapack 2 Datasheet
- USDA FoodData Central — fdc.nal.usda.gov
- Syngenta Hackathon KB (7 documents via MCP)
