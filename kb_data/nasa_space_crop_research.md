# NASA Space Crop Research & Advanced Life Support Data

Sources: NASA JSC-67378 (ALS Baseline Values), NASA/CR-2004-208941 (Advanced Life Support), Kennedy Space Center Biomass Production Chamber data, NASA Vegetable Production System (Veggie) results.

---

## Crop Selection Rationale for Mars Surface Mission

### Why These 16 Crops

NASA's Advanced Life Support (ALS) program identified crops for bioregenerative life support based on:
1. **Caloric density per m²** — limited greenhouse space must maximize energy output
2. **Nutritional completeness** — supplement degraded nutrients in packaged food
3. **Growth cycle diversity** — stagger harvests for continuous food supply
4. **Resource efficiency** — water, power, and crew-time per kg of food
5. **Reliability** — proven performance in controlled environment agriculture (CEA)
6. **Compact growth habit** — vertical space constraints in habitat modules

### Zone Allocation Strategy

| Zone | Area | Purpose | % of Total | Crops |
|------|------|---------|-----------|-------|
| A | 80 m² (soil) | Caloric backbone | 40% | Dwarf Wheat (Apogee), Sweet Potato |
| B | 50 m² (hydro) | Protein + fat | 25% | Soybean |
| C | 45 m² (hydro) | Micronutrients + Vitamin C | 22.5% | Kale, Spinach, Cherry Tomato |
| D | 25 m² (hydro) | Rapid response | 12.5% | Radish, Microgreens |

**Zone A (40% — Calories):** Wheat and sweet potato are the highest caloric yield crops suitable for CEA. Sweet potato also provides critical Vitamin A (beta-carotene). Zone A uses soil medium because sweet potato requires it for tuber formation, and wheat performs well in soil. Soil also provides a disease-isolated environment (no water-borne pathogen spread from hydro zones).

**Zone B (25% — Protein):** Soybean is the only crop providing complete protein (all essential amino acids) plus significant fat content. A crew of 4 needs approximately 50-70g protein per person per day; soybean production aims to supplement the 30-40% that degrades in packaged food protein sources.

**Zone C (22.5% — Micronutrients):** These crops target the vitamins most affected by storage degradation: Vitamin C (kale, cherry tomato), Vitamin K (kale, spinach), Folate (spinach), and lycopene (cherry tomato — radiation protection). Hydroponic production enables dense planting and rapid cycling.

**Zone D (12.5% — Rapid Response):** Radish (25-30 day cycle) and microgreens (7-14 days) provide emergency nutrition capability. If any other zone suffers catastrophic loss, Zone D can produce edible food within 1-2 weeks while replanting occurs.

---

## Spaceflight Nutritional Requirements

### Crew of 4, 450-Day Surface Mission

| Nutrient | Daily Need (per person) | Daily Need (crew of 4) | Key Greenhouse Sources |
|----------|:---:|:---:|---|
| Calories | 2,800-3,200 kcal | 11,200-12,800 kcal | Wheat, Sweet Potato, Soybean |
| Protein | 50-70 g | 200-280 g | Soybean, Wheat, Dry Beans |
| Fat | 60-90 g | 240-360 g | Soybean |
| Vitamin C | 90-200 mg | 360-800 mg | Kale, Cherry Tomato, Pepper, Spinach |
| Vitamin K | 90-120 µg | 360-480 µg | Kale, Spinach |
| Folate | 400-600 µg | 1,600-2,400 µg | Spinach, Soybean, Dry Beans |
| Vitamin A | 700-900 µg RAE | 2,800-3,600 µg RAE | Sweet Potato, Kale, Spinach |
| Calcium | 1,000-1,500 mg | 4,000-6,000 mg | Kale, Soybean |
| Iron | 8-18 mg | 32-72 mg | Soybean, Spinach, Dry Beans |
| Fiber | 25-38 g | 100-152 g | Sweet Potato, Wheat, Soybean, Kale |
| Potassium | 2,600-3,400 mg | 10,400-13,600 mg | Sweet Potato, Soybean, Spinach |

### Space-Specific Nutritional Priorities

**Higher calcium needs:** Bone density loss in reduced gravity (Mars = 0.38g) requires 1,200-1,500 mg calcium/day per person. Kale and soybean are critical calcium sources. Packaged food calcium supplements degrade over time.

**Antioxidant emphasis:** Mars surface radiation (0.67 mSv/day GCR + solar particle events) increases oxidative stress. Lycopene (tomato), beta-carotene (sweet potato, kale), and Vitamin C (kale, pepper) are essential. These antioxidants degrade 30-60% in packaged food over 450+ days.

**Vitamin C priority:** Vitamin C is the MOST storage-sensitive nutrient. After 18 months in packaged food, Vitamin C content drops 50-80%. The greenhouse MUST produce sufficient Vitamin C to compensate. Target: 150-200 mg/person/day from fresh crops.

**Fiber for gut health:** Spaceflight disrupts gut microbiome. Fresh fiber from whole vegetables supports digestive health better than fiber supplements. Minimum 25g/person/day from greenhouse sources.

---

## Closed-Loop Resource Targets

### Water Recycling

| Parameter | Target | Notes |
|-----------|--------|-------|
| Water recycling efficiency | 95% | 5% lost to plant transpiration vented to habitat HVAC |
| Daily water input per m² | 2.5-4.0 L | Varies by crop and growth stage |
| Total daily water need | 500-800 L | For 200 m² greenhouse |
| Reservoir capacity | 2,000 L | 2.5-4 day buffer |
| Minimum safe reservoir | 50 L | NEVER go below — system failure threshold |

**Water flow:** Nutrient reservoir → irrigation → plant uptake/transpiration → condensate recovery → filtration → reservoir. Hydroponic zones (B, C, D) share water circuit. Zone A (soil) has separate water supply.

**Contamination risk:** Shared hydro water means pathogen spread between Zones B, C, D. Monitor water_quality_anomaly sensor. Quarantine isolates a zone's water supply from the shared circuit.

### Power Budget

| System | Power Draw | Priority |
|--------|-----------|----------|
| LED Lighting (all zones) | 6-10 kW | Can reduce during crises |
| HVAC / Temperature Control | 2-3 kW | CRITICAL — crop death below 5°C |
| Water Pumps / Irrigation | 0.5-1 kW | CRITICAL — crop death without water |
| Sensors / Controls | 0.2-0.5 kW | CRITICAL — blind without sensors |
| UV-C Treatment (when active) | 2 kW | On-demand only |
| **Total Nominal** | **9-15 kW** | |
| **Minimum Life Support** | **3 kW** | Heating + pumps + sensors |

**Power sources:**
- Nuclear RTG baseline: 15 kW continuous (reliable)
- Solar panels: 5-8 kW peak (variable, zero during dust storms)
- Battery storage: 500 kWh (allows ~33-50 hours at full load without solar)

**Dust storm protocol:** Solar drops to 0. Battery provides buffer. Reduce lighting to minimum (2-3 kW for high-priority zones only). Maintain heating and water. Budget: 3 kW life support + 2-3 kW priority lighting = 5-6 kW during storms.

**CRITICAL THRESHOLD: Never reduce total power below 3 kW.** Below this, heating fails and crops freeze. This is an unrecoverable loss.

---

## Mars Environmental Factors

### CO₂ Advantage
Mars atmosphere is 95% CO₂ at 600 Pa (0.6% of Earth pressure). For greenhouse use:
- Atmospheric CO₂ is FREE — no need to generate or compress significantly
- Target greenhouse CO₂: 800-1200 ppm (3-4x Earth ambient, optimal for C3 crops)
- All 16 crops are C3 photosynthesis — they benefit from elevated CO₂
- Expected yield boost: 15-40% depending on crop (wheat and soybean respond most)
- Apogee dwarf wheat was specifically bred for high-CO₂ response

### Radiation Considerations
- Mars surface: ~0.67 mSv/day from GCR
- Solar particle events (SPE): occasional high-dose events
- Greenhouse shielding: regolith covering provides partial protection
- Crop radiation effects: minimal at Mars surface levels (plants are more radiation-tolerant than humans)
- Key concern is HUMAN nutrition to combat radiation oxidative stress, not crop damage

### Dust Storms
- **Local storms:** 1-3 sol duration, 50-80% solar reduction
- **Regional storms:** 1-3 week duration, 80-95% solar reduction
- **Global storms:** Months duration, 95-99% solar reduction (RARE but catastrophic)
- Dust deposition on solar panels requires cleaning
- Greenhouse is sealed — no direct dust infiltration to crops

**Dust storm crop impact by growth stage:**
| Growth Stage | Vulnerability | Strategy |
|-------------|:---:|---|
| Seedling (0-14 days) | HIGHEST | Sacrifice if necessary — fastest to replant |
| Vegetative (14-45 days) | MODERATE | Hibernate — reduce light/water, survive on reserves |
| Flowering/Fruiting | MODERATE-HIGH | Protect if near harvest, hibernate if early |
| Near Harvest | LOWEST vulnerability, HIGHEST value | PROTECT — divert all resources here |
| Microgreens | LOW (fast cycle) | Can restart within days of storm clearing |

### Gravity Effects (0.38g)
- Water behavior differs: larger droplets, slower drainage in soil
- Hydroponic systems less affected (water is pumped)
- Root zone aeration more critical in soil (Zone A)
- Plant stems may grow taller/weaker — support structures recommended for tomatoes, peppers
- Positive: reduced mechanical stress on plants

---

## NASA Crop Trial Key Results

### Biomass Production Chamber (BPC) Results

| Crop | Tested Yield (CEA) | Notes |
|------|:---:|---|
| Apogee Wheat | 0.8-1.2 kg/m² grain | 62-65 day cycle, 24h light |
| Soybean | 0.35 kg/m² dry seed | 12h photoperiod for flowering |
| Sweet Potato | 6-9 kg/m² tubers | 120-day cycle, leaf harvest adds 30% edible biomass |
| Lettuce | 3-5 kg/m²/cycle | 28-day cycle, Waldmann's Green tested |
| Radish | 2-3 kg/m²/cycle | 25-day cycle, Cherry Belle variety |
| Tomato | 10-15 kg/m²/cycle | 85-day cycle, Red Robin for compact growth |

### Veggie/APH (ISS) Results
- Lettuce (Outredgeous): Successfully grown and consumed on ISS (2015+)
- Radish: Grown in APH, 27-day cycle confirmed in microgravity
- Peppers: Grown in APH (2021), successful fruit set in microgravity
- Key learning: Controlled environment compensates for gravity differences
- Key learning: Crew morale significantly boosted by fresh food access
