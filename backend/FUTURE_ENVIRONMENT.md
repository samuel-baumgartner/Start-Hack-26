# Future Environment Additions

Scientific features considered but not implemented in the current simulation. Documented for pitch Q&A and future development.

---

## 1. Radiation Events (SPE / GCR)

Mars has no magnetosphere — solar particle events and galactic cosmic rays hit crops directly. Two modeling angles:

- **Negative**: SPE events as a stress factor (crop damage, DNA mutation)
- **Positive**: Controlled UV-B LED pulses before harvest boost antioxidant content by 20–50% (photomorphogenic light control). Turns a threat into a nutritional advantage.

**Why not implemented**: Unclear how to model radiation dose → crop stress quantitatively. Would need dose-response curves from space agriculture literature.

**Pitch angle**: "We turn radiation events into a nutritional advantage" — good soundbite if asked about Mars-specific adaptations.

---

## 2. Low-Gravity Irrigation (0.38g)

Water clings to roots 2.6× longer in Mars gravity — capillary action is stronger, so hydroponic systems need less frequent irrigation. Currently the simulation treats water delivery identically to Earth conditions.

**Why not implemented**: Scientifically interesting but hard to demo visually. The irrigation_rate scaling factor already lets the agent reduce water use — the physics justification is just different.

**Pitch angle**: "Mars gravity actually helps us — water stays on roots longer, so we irrigate less frequently. Our simulation accounts for this through reduced baseline water requirements."

---

## 3. Seed Inventory / Succession Planting

Real Mars mission: fixed seed inventory brought from Earth, imperfect germination rates, need to plan succession planting so all zones don't harvest simultaneously (causing nutrition gaps). Currently the simulation allows planting any crop at any time.

**Why not implemented**: Not a restricting factor for the simulation's core value proposition. The agent already manages planting/harvesting timing through the nutrition optimizer.

---

## 4. Ethylene Management

Ripening fruits (tomatoes, peppers) produce ethylene gas which accelerates aging in nearby leafy greens. Real controlled-environment greenhouses use ethylene scrubbers or separate growing chambers.

**Why not implemented**: Adds biochemical detail but low demo impact. Worth mentioning in Q&A as a real-world consideration: "In production, we'd add ethylene monitoring — our zone-based architecture already isolates fruiting crops from leafy greens."

---

## 5. Photoperiod Growth Effects

The agent can set `photoperiod_hours` per zone and the value is stored, but the simulation's growth model doesn't differentiate between 16h and 20h photoperiods. Real crops are photoperiod-sensitive — some are long-day plants, some short-day.

**Why not implemented**: Similar to ethylene — adds realism but low demo visibility. The lighting on/off cycle is modeled (night = no PAR = reduced growth via light stress multiplier), which captures the primary effect.

---

## 6. Per-Crop Nutrient Solution Depletion

Currently pH drifts up and EC drifts down uniformly across all zones. In real hydroponics, different crops deplete different ions at different rates (lettuce pulls nitrogen, tomatoes pull potassium, calcium uptake varies by growth stage).

**Why not implemented**: Too granular for a 3-minute pitch. The current pH/EC drift model captures the macro behavior (solution degradation over time) that the agent needs to manage.

---

## Q&A Preparation

### "How does the agent learn over time?"

AgentCore Memory is implemented. Demo needs a concrete example: "On Sol 12, FLORA recorded that reducing irrigation helped lettuce during high humidity. On Sol 47, when similar conditions appeared, it retrieved that memory and applied the lesson." This is episodic learning via semantic vector search — the agent queries by meaning, not keywords.

### "How do you handle the 4–24 minute comms delay to Earth?"

This is exactly why FLORA is autonomous. The architecture is designed for a two-tier model:
- **Local reflex layer**: Small models running on-site for sub-second reaction (sensor anomaly detection, emergency shutoffs). These never need Earth comms.
- **Orchestrator layer (FLORA)**: Runs every tick (6 simulated hours) for strategic decisions. Even at maximum comms delay, a 24-minute round trip is negligible against a 6-hour decision cycle.
- The comms channel is not hogged — the orchestrator queries are infrequent and the local layer handles everything time-critical.

In the current demo, FLORA runs as the orchestrator on Bedrock. In a real deployment, the local layer would be an edge model (Haiku-class) with FLORA as the cloud-based strategic planner.

### "What about Earth applicability?"

Every system we built applies directly to controlled-environment agriculture on Earth:
- Disease detection from indirect sensors (NDVI, growth anomaly) → commercial greenhouse monitoring
- Constrained nutritional optimization → vertical farming crop planning
- Autonomous crisis response (dust storm triage, power failure load-shedding) → desert farming, post-disaster food production, Arctic greenhouses
- Water recycling optimization → water-scarce regions

Syngenta already operates in 100+ countries with precision agriculture. This is a prototype of autonomous crop management that scales from Mars to Earth.
