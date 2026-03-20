# Disease Treatment Protocols for FLORA Greenhouse

Sources: Plant pathology literature, CEA disease management research, NASA BPC phytopathology reports.

---

## Disease-Crop Susceptibility Matrix

| Crop | Pythium Root Rot | Powdery Mildew | Bacterial Wilt |
|------|:---:|:---:|:---:|
| Dwarf Wheat | LOW (soil zone) | MODERATE | LOW |
| Sweet Potato | LOW (soil zone) | LOW | HIGH (Zone A, soil) |
| Soybean | HIGH (hydro) | MODERATE | LOW |
| Kale | HIGH (hydro) | HIGH | LOW |
| Spinach | HIGH (hydro) | HIGH | LOW |
| Cherry Tomato | HIGH (hydro) | MODERATE | LOW |
| Radish | MODERATE (hydro) | LOW | LOW |
| Microgreens | MODERATE (hydro) | LOW | LOW |
| Lettuce | HIGH (hydro) | MODERATE | LOW |
| Potato | LOW (soil zone) | LOW | MODERATE |
| Basil | HIGH (hydro) | HIGH | LOW |
| Pepper | MODERATE | MODERATE | MODERATE |
| Tomato | HIGH (hydro) | HIGH | MODERATE |
| Dry Beans | HIGH (hydro) | MODERATE | LOW |

**Key patterns:**
- Hydroponic zones (B, C, D) are at highest risk for Pythium — shared water systems enable rapid spread
- Zone A (soil) is the only zone susceptible to Bacterial Wilt
- Powdery Mildew can affect ANY zone — it's airborne, not water-borne
- Leafy greens (kale, spinach, lettuce, basil) are most susceptible to Powdery Mildew

---

## Disease 1: Pythium Root Rot (Pythium spp.)

### Sensor Pattern Detection

| Sensor | Early Warning | Active Infection | Advanced |
|--------|:---:|:---:|:---:|
| leaf_color_index | 55-65 (subtle drop) | 30-50 | Below 20 |
| growth_rate_anomaly | -10% to -20% | -50% to -76% | -76% to -97% |
| water_quality_anomaly | 0.2-0.3 | 0.4-0.7 | 0.7-1.0 |

**Diagnostic fingerprint:** Water quality anomaly rises FIRST (before visible leaf symptoms). If water_quality_anomaly > 0.3 AND growth_rate_anomaly < -20% in a hydro zone → Pythium is the primary suspect.

### Spread Mechanics
- **Water-borne transmission** between hydro zones B, C, and D through shared reservoir
- Spread rate: Can infect adjacent hydro zone within 2-4 ticks (12-24 simulated hours) if untreated
- Zone A (soil) is IMMUNE to water-borne spread from hydro zones
- Zoospores thrive in warm water (>25°C) and stagnant conditions

### Treatment Decision Tree

```
Pythium Detected?
├── Single hydro zone affected, severity < 30
│   ├── IMMEDIATE: treat_disease_uvc(zone_id) — 99% pathogen kill
│   ├── IMMEDIATE: adjust_humidity(zone_id, 50) — slow fungal growth
│   ├── MONITOR: Check adjacent hydro zones every tick
│   └── EXPECTED: Severity drops below 5 within 2-3 ticks → cured
│
├── Single hydro zone, severity 30-60
│   ├── IMMEDIATE: quarantine_zone(zone_id) — stop water spread
│   ├── IMMEDIATE: treat_disease_uvc(zone_id)
│   ├── FOLLOW-UP: treat_disease_h2o2(zone_id) — stack treatments
│   ├── CONSIDER: remove_infected_crops for worst-affected crop (-30 severity)
│   └── MONITOR: Adjacent zones for 3+ ticks after quarantine
│
├── Multiple hydro zones affected
│   ├── CRITICAL: quarantine ALL affected zones immediately
│   ├── TRIAGE: UV-C treat the zone with highest-value crops first
│   ├── TRIAGE: Consider sacrificing lowest-value zone to save resources
│   ├── ASSESS: If all 3 hydro zones affected, prioritize Zone B (soybean = protein)
│   └── EMERGENCY: Deploy microgreens if >50% hydro capacity lost
│
└── Severity > 60 in any zone
    ├── LIKELY LOSS: Crop survival unlikely without aggressive intervention
    ├── remove_infected_crops to reduce severity by 30
    ├── treat_disease_uvc + treat_disease_h2o2 (stack both)
    ├── quarantine_zone to prevent further spread
    └── Begin replanting plan for affected zone
```

### Treatment Efficacy
| Treatment | Efficacy | Side Effects | Power Cost |
|-----------|----------|-------------|-----------|
| UV-C Sterilization | 99% pathogen kill | None | 2 kW per treatment |
| H₂O₂ (Hydrogen Peroxide) | 50-75% effective | Raises EC temporarily | Minimal |
| Humidity Reduction (<60%) | Slows growth, doesn't cure | Reduced crop transpiration | Minimal |
| Quarantine | 100% spread prevention | Stops crop growth in zone | None |
| Crop Removal | -30 severity per crop removed | Lose crop biomass | None |

---

## Disease 2: Powdery Mildew (Erysiphe spp.)

### Sensor Pattern Detection

| Sensor | Early Warning | Active Infection | Advanced |
|--------|:---:|:---:|:---:|
| leaf_color_index | 50-60 (5-15 point drop) | 35-50 | Below 30 |
| growth_rate_anomaly | -5% to -15% | -30% to -50% | Below -50% |
| water_quality_anomaly | Normal (0-0.1) | Normal | Normal |

**Diagnostic fingerprint:** Leaf color drops 5-15 points BEFORE health significantly drops. Water quality remains NORMAL (mildew is airborne, not water-borne). This is the key differentiator from Pythium.

### Spread Mechanics
- **Airborne transmission** — can spread to ANY zone regardless of water connections
- Favored by HIGH humidity (>70%) and moderate temperatures (18-25°C)
- Spore production peaks at 60-80% relative humidity
- Completely stops spreading below 50% humidity
- Does NOT spread through water (unlike Pythium)

### Treatment Decision Tree

```
Powdery Mildew Detected?
├── Any zone, severity < 20
│   ├── IMMEDIATE: adjust_humidity(zone_id, 45) — below 50% stops mildew
│   ├── OPTIONAL: treat_disease_h2o2(zone_id) — helps but not primary
│   ├── MONITOR: Watch ALL zones (airborne spread)
│   └── EXPECTED: Low humidity + time → severity drops below 5 → cured
│
├── Severity 20-50
│   ├── IMMEDIATE: adjust_humidity(zone_id, 45)
│   ├── IMMEDIATE: treat_disease_uvc(zone_id) — 99% kill
│   ├── CHECK: Humidity in ALL zones — reduce globally if >60%
│   └── MONITOR: 2-3 ticks for resolution
│
├── Severity > 50
│   ├── IMMEDIATE: treat_disease_uvc(zone_id)
│   ├── IMMEDIATE: adjust_humidity(zone_id, 40) — aggressive dehumidification
│   ├── CONSIDER: remove_infected_crops if high-severity single crop
│   └── REPLANT: Plan succession planting for affected crops
│
└── Multiple zones affected (airborne spread confirmed)
    ├── GLOBAL: Reduce humidity in ALL zones to 45%
    ├── TREAT: UV-C each affected zone (prioritize highest-value crops)
    ├── NOTE: Quarantine does NOT help — mildew is airborne
    └── FOCUS: Humidity control is the primary countermeasure
```

**Critical note:** Quarantining zones does NOT stop Powdery Mildew spread since it's airborne. Quarantine only helps with water-borne diseases (Pythium). The primary countermeasure is humidity reduction below 50%.

---

## Disease 3: Bacterial Wilt (Ralstonia solanacearum)

### Sensor Pattern Detection

| Sensor | Early Warning | Active Infection | Advanced |
|--------|:---:|:---:|:---:|
| leaf_color_index | 50-65 (rapid drop) | 25-45 | Below 20 |
| growth_rate_anomaly | -10% to -30% | -30% to -70% | -70% to -90% |
| water_quality_anomaly | Normal to slightly elevated | 0.1-0.3 | Variable |

**Diagnostic fingerprint:** RAPID leaf color decline in Zone A + temperature above 28°C. Bacterial Wilt is primarily a soil-borne disease affecting Zone A. If you see fast health decline in Zone A crops with warm temperatures, suspect Bacterial Wilt first.

### Spread Mechanics
- **Soil-borne** — primarily affects Zone A
- Temperature-dependent: worse ABOVE 28°C, slows below 20°C
- Short incubation period: symptoms appear within 1-2 ticks
- Does NOT spread to hydro zones (B, C, D)
- Bacteria persist in soil even after infected plants are removed

### Treatment Decision Tree

```
Bacterial Wilt Detected in Zone A?
├── CRITICAL FACT: THERE IS NO CURE FOR BACTERIAL WILT
│
├── Severity < 20, single crop affected
│   ├── IMMEDIATE: remove_infected_crops(zone_A, affected_crop)
│   ├── IMMEDIATE: adjust_temperature(zone_A, 20) — cool below wilt-favorable range
│   ├── DO NOT: Waste UV-C or H₂O₂ — limited efficacy against Ralstonia in soil
│   └── MONITOR: Watch remaining Zone A crops closely
│
├── Severity 20-50
│   ├── IMMEDIATE: remove_infected_crops for all affected crops
│   ├── IMMEDIATE: Lower temperature below 24°C
│   ├── CONSIDER: quarantine_zone to prevent any minimal cross-contamination
│   ├── ASSESS: Is caloric loss from Zone A (wheat + sweet potato) recoverable?
│   └── CONTINGENCY: Increase Zone B-D production to compensate
│
├── Severity > 50 — Zone A likely lost
│   ├── ACCEPT LOSS: Remove all infected crops
│   ├── quarantine_zone(zone_A, true)
│   ├── EMERGENCY: deploy_microgreens() to compensate caloric loss
│   ├── REPLANT: After full crop removal, wait 2+ ticks before replanting
│   └── ADJUST: Lower Zone A temp to 18-20°C to suppress residual bacteria
│
└── Prevention
    ├── Keep Zone A temperature below 28°C when possible
    ├── Monitor leaf_color_index for rapid unexplained drops
    ├── Sweet Potato is MORE susceptible than Dwarf Wheat
    └── Zone A soil isolation means wilt CANNOT spread to hydro zones
```

**CRITICAL: Bacterial Wilt has NO CURE.** UV-C and H₂O₂ have minimal efficacy against Ralstonia in soil. The ONLY effective response is:
1. Remove infected crops immediately
2. Lower temperature to slow bacterial growth
3. Accept crop losses and compensate with other zones
4. Replant after soil has had time to recover

---

## Combined Disease Scenarios

### Scenario: Pythium in hydro + Bacterial Wilt in soil (simultaneous)
- **Priority:** Pythium spreads faster — treat hydro zones first
- Bacterial Wilt is contained to Zone A (no spread risk to hydro)
- Allocate UV-C power to hydro zones (more effective against Pythium than Ralstonia)
- Accept Zone A losses if necessary, protect protein/micronutrient zones

### Scenario: Powdery Mildew + Pythium (simultaneous)
- **Priority:** Quarantine Pythium-affected zones (stops water spread)
- Reduce humidity globally to 45% (treats mildew AND slows Pythium)
- UV-C treat worst zone first
- Monitor carefully — two simultaneous infections can cascade quickly

### Cross-Zone Treatment Priority
When resources are limited, treat zones in this priority order:
1. **Zone B (Soybean)** — irreplaceable complete protein source
2. **Zone C (Kale + Spinach + Cherry Tomato)** — micronutrient coverage
3. **Zone A (Wheat + Sweet Potato)** — calories (partially replaceable with packaged food)
4. **Zone D (Radish + Microgreens)** — rapid regrow capability, lowest priority for saving
