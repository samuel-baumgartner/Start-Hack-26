# FLORA Agent Flow — Complete Architecture

## Overview

FLORA (Frontier Life-support Optimization & Resource Agent) is an autonomous AI agent managing a simulated Martian greenhouse. It runs on **Claude Sonnet 4.5** via AWS Bedrock, uses the **Strands SDK** for tool orchestration, and optionally connects to a **Syngenta MCP Knowledge Base** for crop science data and **AgentCore Memory** for cross-session persistence.

The agent operates through two entry points: **autonomous ticks** (periodic decision cycles) and **user queries** (natural language chat). In both cases, the agent receives a prompt, reasons about greenhouse state by calling tools, and takes corrective actions — all within a 60-second timeout.

---

## System Initialization

```
main.py (FastAPI startup)
  │
  ├── SimulationEngine()          → creates default greenhouse state
  │     └── create_default_state()  → 4 zones, 9 crops, resource defaults
  │
  ├── Wire engine to all modules:
  │     ├── simulation_routes.set_engine(engine)
  │     ├── event_routes.set_engine(engine)
  │     ├── agent_routes.set_engine(engine)
  │     └── agent/tools.set_engine(engine)   ← tools get direct engine access
  │
  └── create_agent()              → (agent_func, mcp_client) or (None, None)
        ├── BedrockModel("claude-sonnet-4.5")
        ├── _create_mcp_client()   → Syngenta KB via StreamableHTTP
        ├── _create_memory_provider() → AgentCore Memory (auto-provisions if needed)
        └── Agent(model, system_prompt, tools=[16 local + MCP + memory])
```

If AWS credentials are missing, the agent is unavailable (503 on `/agent/*`). If MCP or Memory fail, the agent still works with local tools only — graceful degradation at every layer.

---

## The Two Entry Points

### 1. Autonomous Tick (`POST /agent/tick`)

Called by the frontend's auto-tick loop or manually. The agent receives a generic prompt:

```
"Analyze the current greenhouse state and make decisions.
 Current sol: {N}, tick: {M}.
 Read sensors, check for any issues, and take appropriate actions."
```

This is intentionally open-ended — the agent decides what to investigate based on the system prompt's decision loop protocol.

### 2. User Query (`POST /agent/query`)

The user sends a natural language message (e.g., "Why is Zone C health dropping?"). The agent receives it verbatim and responds conversationally, but can still call any tool during its response.

### Execution Model

Both entry points follow the same path:

```
HTTP request
  → agent_routes.py acquires engine_lock (asyncio.Lock)
  → asyncio.to_thread(agent_func, prompt)    ← blocking Strands call
  → Strands agent loop:
      1. LLM generates text + tool_use blocks
      2. Strands executes tool functions locally
      3. Tool results fed back to LLM
      4. Repeat until LLM emits final text (no more tool calls)
  → Response logged to decision_log + state.agent_decisions
  → Lock released
```

The `engine_lock` prevents concurrent engine mutations (auto-tick, manual tick, agent tick, commands all share it).

---

## Information Sources — What the Agent Can See

The agent has **no direct access** to `GreenhouseState`. Everything flows through the sensor abstraction layer or tool functions. Here's what each source provides:

### `read_sensors(zone_id?)` — Noisy, Per-Zone Physical Data

Returns one or all zones. Each zone reading includes:

| Field | Source | Noise | Notes |
|-------|--------|-------|-------|
| `temperature` | `zone.temperature` | ±0.5°C Gaussian | Can fail (return `null`) |
| `humidity` | `zone.humidity` | ±2.0% | Can fail |
| `co2_ppm` | `zone.co2_ppm` | ±20 ppm | Can fail |
| `par_level` | `zone.par_level` | ±10 µmol/m²/s | Can fail |
| `lighting_on` | `zone.lighting_on` | None (boolean) | Direct passthrough |
| `irrigation_rate` | `zone.irrigation_rate_l_per_hour` | None | Direct passthrough |
| `is_quarantined` | `zone.is_quarantined` | None | Direct passthrough |
| `water_quality_anomaly` | Disease water contamination | ±0.02 (2% turbidity sensor spec) | Suppressed ×0.3 during incubation |

**Per-crop fields** (within each zone's `crops[]`):

| Field | Source | Noise | Notes |
|-------|--------|-------|-------|
| `name` | `crop.crop_name` | None | |
| `growth_stage` | `crop.growth_stage` | None | seedling→vegetative→flowering→fruiting→mature |
| `health` | `crop.health` | None | Can fail (return `null`) |
| `biomass_g` | `crop.biomass_g` | None | Can fail |
| `days_to_harvest` | Computed from planted/total | None | |
| `leaf_color_index` | NDVI-mapped 0-100 | ±3.0 (NDVI ±0.03) | Derived from health + disease severity + env stress |
| `growth_rate_anomaly` | `compute_stress_multiplier()` | ±5.0% | 0% = nominal; negative = stressed |

**Resource fields** (shared across zones):

| Field | Noise | Notes |
|-------|-------|-------|
| `water_reservoir_l` | ±5.0 L | Can fail |
| `ph` | ±0.1 | Can fail |
| `ec` | ±0.05 mS/cm | Can fail |
| `battery_percent` | ±1.0% | Can fail |

**What's NOT here:** `disease_active`, `active_diseases`, `pathogen_alert`. The agent must infer disease from the indirect indicators above.

### `get_greenhouse_status()` — System-Level Summary

A lightweight overview (no per-zone detail):

```json
{
  "sol": 42,
  "tick": 2,
  "is_daytime": true,
  "dust_storm_active": false,
  "power_failure_active": false,
  "water_reservoir_l": 1423.5,
  "battery_percent": 78.3,
  "num_zones": 4,
  "active_zones": 4
}
```

Notably absent: `disease_active`, `active_diseases`. The agent knows about dust storms and power failures (these are physically obvious — the sky goes dark, lights dim), but disease is invisible here.

### `get_nutrition_status()` — Nutritional Coverage Analysis

Returns projected daily yield vs. NASA dietary requirements for 4 crew:

```json
{
  "daily_yield_g": { "kale": 45.2, "spinach": 30.1, ... },
  "coverage_percent": {
    "calories_kcal": 12.3,
    "vitamin_c_mg": 87.5,
    "protein_g": 15.2,
    ...
  },
  "deficiencies": ["calories_kcal", "protein_g"],
  "surplus": ["vitamin_c_mg", "vitamin_k_ug"]
}
```

### Syngenta MCP Knowledge Base (optional)

Connected via StreamableHTTP to a Bedrock AgentCore MCP gateway. Provides crop science lookup tools:
- Optimal growing conditions per crop variety
- Mars-specific environmental constraints
- Nutritional data and crop stress research
- Water management best practices for hydroponics

The agent is instructed to prefer KB data over assumptions. If MCP is unavailable, the agent relies on its training data and the system prompt.

### AgentCore Memory (optional)

Persistent episodic memory across decision cycles:
- `agent_core_memory(action="record", content="...")` — save an observation
- `agent_core_memory(action="retrieve", query="...")` — recall past decisions

Example: "Sol 12 tick 2: Reduced Zone A irrigation from 0.8 to 0.5 L/hr due to high humidity (78%). Lettuce showing early signs of overwatering."

This allows the agent to learn from outcomes across ticks. Memory is scoped to namespace `"greenhouse"`, session `"flora-primary"`.

---

## Tool Calls — What the Agent Can Do

### Read-Only Tools

| Tool | Purpose |
|------|---------|
| `read_sensors(zone_id?)` | Get noisy sensor readings for one or all zones |
| `get_greenhouse_status()` | System-level summary (sol, storms, power, water) |
| `get_nutrition_status()` | Nutritional coverage vs. crew requirements |
| MCP KB tools | Look up crop science data from Syngenta knowledge base |
| `agent_core_memory(action="retrieve")` | Recall past decisions and observations |

### Write Tools (mutate simulation state)

All write tools go through `engine.apply_command()`, which validates inputs and returns `{status, message}`.

| Tool | Effect | Constraints |
|------|--------|-------------|
| `adjust_irrigation(zone_id, rate)` | Set irrigation rate (L/hr) | 0-10 L/hr |
| `adjust_temperature(zone_id, target)` | Set temperature setpoint | 5-40°C |
| `adjust_lighting(zone_id, on, par, photoperiod)` | Control LED arrays | PAR 0-1000, photoperiod 0-24h |
| `set_zone_priority(zone_id, priority)` | Resource allocation priority | normal/high/low/hibernate/sacrifice |
| `quarantine_zone(zone_id, quarantine)` | Isolate zone (stops water flow + crop growth) | Boolean |
| `adjust_humidity(zone_id, target)` | Set humidity setpoint | 30-90% |
| `harvest_crop(zone_id, crop_name)` | Harvest mature crop | Crop must be alive + not already harvested |
| `plant_crop(zone_id, crop_name)` | Plant new crop | Must be in CROP_DATABASE, no duplicate |
| `deploy_microgreens()` | Emergency fast-growing nutrition | Max 3 deployments, prefers Zone D |
| `treat_disease_uvc(zone_id)` | UV-C sterilization (99% pathogen kill) | +2kW power cost |
| `treat_disease_h2o2(zone_id)` | H₂O₂ treatment (50-75% effective) | Raises EC by 0.5 |
| `remove_infected_crops(zone_id, crop_name)` | Sacrifice crop, reduce disease severity by 30 | Crop is destroyed |
| `agent_core_memory(action="record")` | Save observation for future recall | — |

---

## Disease Detection — The Inference Challenge

The agent has **zero direct disease information**. Here's what the simulation knows internally vs. what the agent sees:

### Ground Truth (simulation internal, NOT visible to agent)

```
DiseaseState:
  disease_type: "pythium_root_rot" | "powdery_mildew" | "bacterial_wilt"
  zone_id: "A"-"D"
  stage: "incubating" → "symptomatic" → "critical"
  severity: 0-100
  water_contamination: 0-1
  treated_uvc: bool
  treated_h2o2: bool
```

### What the Agent Actually Sees (indirect signals)

```
leaf_color_index: 85 → 65 → 40 → 15  (as disease progresses)
growth_rate_anomaly: 0% → -20% → -60% → -90%
water_quality_anomaly: 0.0 → 0.1 → 0.4 → 0.8
```

### Signal Characteristics by Disease Type

| Disease | leaf_color | growth_anomaly | water_quality | Unique Signature |
|---------|-----------|----------------|---------------|-----------------|
| **Pythium root rot** | Drops AFTER incubation (root disease → aerial lag) | -76% to -97% (massive) | Rises in hydro zones | Worst growth impact + water signal |
| **Powdery mildew** | Drops 5-15 pts DURING incubation (visible mycelium) | ~-50% | No water signal | Early visual, no water |
| **Bacterial wilt** | Drops fast once symptomatic (×0.35 severity) | -30% to -90% | Slight water signal | Zone A only, temp-sensitive |
| **Env. stress only** | Drops 5-10 pts | > -30% typically | 0.0 | No water, moderate growth |

### The Diagnostic Reasoning Protocol (from system prompt)

1. `leaf_color ↓` + `growth_anomaly < -50%` + `water_quality ↑` → **likely pythium** (hydro B/C/D)
2. `leaf_color` drops 5-15 points before health drops → **likely mildew**
3. `leaf_color` drops fast + Zone A + temp >28°C → **likely bacterial wilt**
4. `leaf_color ↓` but water normal and growth > -30% → **environmental stress**, not disease
5. Multiple hydro zones declining simultaneously → **water-borne spread** (urgent)

---

## The Simulation Tick — What Happens Each Cycle

Each tick = 6 simulated hours. The engine processes in this order:

```
_tick_once():
  1. Time update (sol, tick, daytime flag)
  2. Mars environment (external temp, solar irradiance)
  3. Dust storm progression (opacity decay, storm end check)
  4. Power failure recovery (0.05/sol reduction recovery)
  5. Per-zone physics:
     a. Priority-based adjustments (hibernate → lights off, sacrifice → no heat)
     b. Lighting (day/night cycle, dust storm dimming)
     c. Temperature drift toward setpoint
     d. CO2 and humidity update
     e. Crop growth (if not quarantined):
        - compute_growth_increment() using stress multiplier
        - Biomass accumulation
        - Growth stage progression (seedling→...→mature)
  6. Disease progression (_tick_diseases):
     - Incubating → symptomatic → critical (severity thresholds)
     - Crop damage (reduced by UV-C 70% and H₂O₂ 50%)
     - Water contamination increase for water-borne diseases
     - Severity decrease under treatment + low humidity
     - Resolution: all crops dead OR severity < 5 → cleared
  7. Disease spread (_spread_diseases):
     - Hydro zones B/C/D share water
     - Spread probability = contamination × 0.15 per tick
     - Quarantine cuts the water pipe (blocks spread)
     - Zone A (soil) immune to water-borne spread
  8. Random events (once per sol):
     - Dust storm: 0.5% per sol
     - Disease: 0.2% per sol (hydro zones 3× more likely)
     - Power failure: 0.1% per sol
  9. Global resource updates:
     - Water consumption + 95% recycling
     - Power generation (nuclear 15kW baseline + solar) vs. consumption
     - Battery charge/discharge
     - Nutrient solution pH/EC drift
  10. Sensor failure timer decrements
```

---

## Data Flow Diagram

```
                    ┌─────────────────────────────┐
                    │     Frontend (Next.js)       │
                    │                              │
                    │  GET /sim/state ─── ground   │
                    │  GET /sim/sensors ── noisy   │
                    │  GET /sim/stream ── SSE      │
                    │  POST /agent/query           │
                    │  POST /agent/tick            │
                    └──────────┬──────────────────-┘
                               │ HTTP
                    ┌──────────▼──────────────────-┐
                    │     FastAPI (main.py)         │
                    │     engine_lock (asyncio)     │
                    └──────────┬───────────────────-┘
                               │
          ┌────────────────────┼──────────────────────┐
          │                    │                       │
  ┌───────▼──────┐   ┌────────▼────────┐   ┌─────────▼────────┐
  │ sim_routes   │   │ agent_routes    │   │ event_routes     │
  │              │   │                 │   │                  │
  │ /sim/state   │   │ /agent/tick     │   │ /events/trigger  │
  │ /sim/sensors │   │ /agent/query    │   │ /events/log      │
  │ /sim/tick    │   │ /agent/decisions│   │                  │
  │ /sim/reset   │   │                 │   │                  │
  │ /sim/nutrition│  │                 │   │                  │
  └──────┬───────┘   └────────┬────────┘   └─────────┬────────┘
         │                    │                       │
         │         ┌──────────▼──────────┐            │
         │         │   Strands Agent     │            │
         │         │   (Claude Sonnet)   │            │
         │         │                     │            │
         │         │  ┌── Local Tools ──────────────────────────┐
         │         │  │  read_sensors()       → sensors.py     │
         │         │  │  get_greenhouse_status() → tools.py    │
         │         │  │  get_nutrition_status()  → nutrition.py │
         │         │  │  adjust_*() ──────────→ engine.apply() │
         │         │  │  treat_disease_*() ───→ engine.apply() │
         │         │  │  harvest/plant_crop() ─→ engine.apply() │
         │         │  │  quarantine_zone() ───→ engine.apply() │
         │         │  └────────────────────────────────────────┘
         │         │  ┌── MCP Tools (optional) ────────────────┐
         │         │  │  Syngenta KB queries via Bedrock        │
         │         │  │  AgentCore gateway (StreamableHTTP)     │
         │         │  └────────────────────────────────────────┘
         │         │  ┌── Memory Tools (optional) ─────────────┐
         │         │  │  agent_core_memory(record/retrieve)     │
         │         │  │  AgentCore Memory (Bedrock)             │
         │         │  └────────────────────────────────────────┘
         │         └─────────────────────┘
         │                    │
         │                    │ all reads/writes
         │                    ▼
  ┌──────┴────────────────────────────────────────────┐
  │              SimulationEngine                      │
  │                                                    │
  │  ┌─────────────┐  ┌──────────┐  ┌──────────────┐  │
  │  │ Zones A-D   │  │ Resources│  │ Environment  │  │
  │  │ crops[]     │  │ water    │  │ sol/tick     │  │
  │  │ temp/hum/co2│  │ power    │  │ dust storm   │  │
  │  │ par/lighting│  │ battery  │  │ disease flag │  │
  │  │ quarantine  │  │ pH/EC    │  │ power fail   │  │
  │  └─────────────┘  └──────────┘  └──────────────┘  │
  │                                                    │
  │  ┌─────────────┐  ┌──────────────────────────────┐ │
  │  │ diseases[]  │  │ Sensor Layer (sensors.py)    │ │
  │  │ DiseaseState│  │   get_sensor_readings()      │ │
  │  │ per-zone    │  │   → adds noise               │ │
  │  │ per-type    │  │   → computes leaf_color_index│ │
  │  │             │  │   → computes growth_anomaly  │ │
  │  │             │  │   → suppresses incubation    │ │
  │  │             │  │   get_ground_truth()          │ │
  │  │             │  │   → full state for frontend   │ │
  │  └─────────────┘  └──────────────────────────────┘ │
  └────────────────────────────────────────────────────┘
```

---

## Sensor Layer — The Information Boundary

The sensor layer (`sensors.py`) is the critical boundary between simulation truth and agent perception:

### Agent Path: `get_sensor_readings()`
- Adds Gaussian noise (calibrated to real sensor specs)
- Can return `null` for failed sensors
- Computes derived metrics:
  - `leaf_color_index`: NDVI-mapped from health + disease severity + env stress
  - `growth_rate_anomaly`: from `compute_stress_multiplier()` (accounts for temp, light, water, health)
  - `water_quality_anomaly`: from disease water contamination, with incubation suppression (×0.3)
- **Removes**: `pathogen_alert`, `disease_active`, `active_diseases`

### Frontend Path: `get_ground_truth()`
- Exact values, no noise, no failures
- Includes full disease details: `[{disease_type, stage, severity}]`
- Used by `/sim/state` for debugging and dashboard display

### Sensor Failures
- Any sensor can be failed via `trigger_event("sensor_failure", {zone_id, sensor_name, duration_ticks})`
- Valid sensors: `temperature`, `humidity`, `co2`, `par`, `health`, `biomass`, `water_level`, `ph`, `ec`, `battery`, `water_quality`, `leaf_color`, `growth_anomaly`
- Failed sensors return `null` — the agent must handle missing data gracefully

---

## Auto-Tick Loop + SSE

The auto-tick system drives continuous simulation:

```
POST /auto-tick/start?interval=2.0
  → auto_tick_loop() runs every 2s:
      1. Acquire engine_lock
      2. engine.tick(1)
      3. Build state snapshot
      4. Release lock
      5. Broadcast to all SSE subscribers

GET /sim/stream
  → SSE connection: receives state snapshots in real-time
  → Frontend uses this for live dashboard updates
```

The agent tick (`POST /agent/tick`) is separate from the simulation tick (`POST /sim/tick`). The frontend can advance the simulation and then optionally ask the agent to analyze and act. Or the auto-tick can run continuously while the agent is called periodically.

---

## Fallback Agent

If the Strands SDK fails to import, a **fallback agent** is created using raw `bedrock-runtime.invoke_model()`:

- Single-turn only (no tool loop)
- Pre-fetches `get_greenhouse_status()` + `get_nutrition_status()` and injects into the prompt
- Cannot call tools during response
- Limited but functional for basic Q&A

---

## Zone Configuration

| Zone | Area | Substrate | Crops | Purpose |
|------|------|-----------|-------|---------|
| A | 80 m² | Soil | Dwarf Wheat, Sweet Potato | Caloric backbone + Vitamin A |
| B | 50 m² | Hydro | Soybean | Protein, fat, folate |
| C | 45 m² | Hydro | Kale, Spinach, Cherry Tomato | Micronutrients + Vitamin C |
| D | 25 m² | Hydro | Radish, Microgreens | Emergency rapid nutrition |

Hydro zones B/C/D share water — water-borne diseases (pythium) can spread between them. Zone A (soil) is isolated from water spread.

---

## Crisis Event System

Events can be triggered manually (`POST /events/trigger`) or randomly (once per sol):

| Event | Probability/Sol | Effect |
|-------|-----------------|--------|
| Dust storm | 0.5% | High opacity → reduced solar → power stress |
| Disease | 0.2% | Pathogen in random zone (hydro 3× more likely) |
| Power failure | 0.1% | 20-60% solar generation reduction |
| Sensor failure | Manual only | Specific sensor returns `null` |
| Crop failure | Manual only | Sets crop health to 0 |

The agent must detect and respond to these through its available information sources.

---

## Future Plans

### Baseline Calibration — The Missing Piece

The agent currently compares sensor readings against **static thresholds** in its system prompt (e.g., "leaf_color 60-90 = healthy"). This is a known limitation: dwarf wheat in Zone A naturally sits around leaf_color 78-82 due to the warmer setpoint, while kale in Zone C might read 83-87. A 23-point drop in kale is alarming; the same absolute value for wheat might be normal. Two planned improvements address this from complementary angles.

### 1. Self-Calibration via AgentCore Memory

The agent should record empirical baselines during healthy operation and recall them for comparison during anomaly detection.

**How it works:**
- During the first N ticks with no anomalies, the agent records per-crop, per-zone baseline readings:
  > `agent_core_memory(action="record", content="BASELINE Sol 3: Zone C kale leaf_color=84.2, growth_anomaly=-2.1%, water_quality=0.01. Healthy, no stress.")`
- When readings deviate, it retrieves the baseline:
  > `agent_core_memory(action="retrieve", query="baseline leaf_color kale Zone C")`
- The agent can then reason about **relative deviation** ("kale dropped 22 points from its baseline of 84") rather than just absolute thresholds.

**Limitations:**
- Requires several healthy ticks before baselines are established — no calibration at tick 0.
- Baselines are lost on simulation reset unless memory persists across sessions (it does with AgentCore Memory, but session scoping matters).
- The agent must be prompted to actually do this — it needs explicit instructions in the system prompt to record baselines during calm periods.

### 2. S3-Backed Bedrock Knowledge Base for Reference Data

A separate Bedrock Knowledge Base (RAG) backed by S3 would provide **pre-computed reference data** the agent can query from tick 0. This is distinct from the Syngenta MCP KB (which provides general crop science) — this KB would contain simulation-specific baseline profiles.

**What goes in the S3 bucket:**
- **Per-crop baseline profiles**: "Healthy dwarf wheat at vegetative stage in soil substrate at 27°C setpoint: leaf_color 75-82, growth_anomaly -12% to +3%"
- **Per-zone expected ranges**: "Zone A runs leaf_color 5-8 points lower than hydro zones due to soil substrate and warmer setpoint"
- **Growth-stage transition signatures**: "Soybean growth_anomaly naturally dips to -15% during flowering transition — this is not disease"
- **Historical incident patterns**: "Pythium in hydro zones typically shows water_quality > 0.2 within 2 ticks of symptom onset, growth_anomaly crosses -50% by tick 4"
- **Differential diagnosis tables**: "If leaf_color drop > 20 points AND growth_anomaly < -40% AND water_quality < 0.1 → nutrient deficiency, not disease (no water signal)"

**Architecture:**
```
S3 bucket (baseline-reference-data/)
  ├── crop_profiles/
  │     ├── dwarf_wheat_baselines.md
  │     ├── kale_baselines.md
  │     └── ...
  ├── zone_profiles/
  │     ├── zone_a_soil_expected.md
  │     └── zone_bcd_hydro_expected.md
  └── diagnostic_patterns/
        ├── disease_signatures.md
        └── false_positive_patterns.md
          ↓
Bedrock Knowledge Base (RAG, embeddings)
          ↓
MCPClient or Strands tool wrapper
          ↓
Agent queries: "What are normal leaf_color ranges for kale in hydro at vegetative stage?"
```

**Why both approaches:**
- The KB provides **instant calibration** from tick 0 — no warm-up needed.
- AgentCore Memory provides **adaptive calibration** — the agent learns that *this specific simulation run* has kale reading slightly higher than the KB baseline, perhaps due to particularly good lighting conditions.
- Together they mirror how a real greenhouse operator works: reference manuals (KB) plus personal experience (memory).

**AWS stack integration:**
- S3 for document storage
- Bedrock Knowledge Base for RAG retrieval with embeddings
- Could use the same AgentCore gateway pattern as the Syngenta MCP, or wrap as a direct Bedrock `retrieve` API call in a Strands `@tool` function
- Adds to the existing Bedrock model + AgentCore Memory + MCP stack already in use
