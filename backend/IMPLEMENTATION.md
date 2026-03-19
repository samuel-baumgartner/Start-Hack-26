# Mars Greenhouse Backend — Implementation Log

## Architecture

```
Next.js Frontend (port 3000)
    │  rewrites /api/* →
    ▼
FastAPI Backend (port 8000)
    ├── Simulation Engine (pure Python, no AWS)
    ├── Sensor Abstraction Layer
    ├── Event System (crises)
    ├── Nutrition Optimizer (scipy)
    └── AI Agent (Strands SDK + Bedrock)
```

---

## Step 1: Config + Data Models

**Files:** `config.py`, `simulation/state.py`, `requirements.txt`

**What was built:**
- All mission constants ported from `context.md` appendix (CREW_SIZE=4, MARS_GRAVITY=3.72, etc.)
- Sensor noise parameters (temp ±0.5°C, humidity ±2%, CO2 ±20ppm)
- Power subsystem defaults (lighting 1.5kW/zone, heating 4kW, life support 3kW)
- Pydantic models: `CropStatus`, `Zone`, `ResourceState`, `EnvironmentState`, `GreenhouseState`
- `GrowthStage` enum: seedling → vegetative → flowering → fruiting → mature → harvested
- `create_default_state()` factory with 6 zones:
  - A: lettuce + kale
  - B: spinach + basil
  - C: tomato
  - D: pepper + radish
  - E: soybean
  - F: microgreens

**AWS tools integrated:** None — pure Python/Pydantic

**Issues:** None

---

## Step 2: Simulation Engine Core + Sensor Layer

**Files:** `simulation/crops.py`, `environment.py`, `resources.py`, `sensors.py`, `engine.py`

### Crops (`crops.py`)

- 9-crop database with full hydroponic parameters: days to harvest, yield/m²/day, water use, optimal temp/PAR/pH ranges, power draw
- USDA-approximate nutritional profiles per 100g for each crop (9 nutrients tracked)
- Logistic growth curve: `biomass(t) = K / (1 + e^(-steepness * (t - t_half)))`
- Stress multiplier combining temperature, light, water, and health factors (0.0–1.0)
- Growth increment = peak_yield × zone_area × logistic_derivative × stress

### Environment (`environment.py`)

- Sinusoidal solar irradiance: peak at solar noon, zero at night, attenuated by dust via Beer-Lambert law (`I = I₀ × e^(-τ)`)
- External temperature: sinusoidal around -60°C ± 30°C
- Greenhouse temperature: drifts toward external at 0.5°C/hr, countered by heating
- CO2 dynamics: consumed by photosynthesis during day, replenished from Mars atmosphere (free CO2)
- Humidity: increases with irrigation, dehumidification pulls toward 70% target

### Resources (`resources.py`)

- Water: consumed by irrigation proportional to crop area, 90% recycled, net loss from reservoir
- Solar power: 50m² panels at 20% efficiency, reduced by dust storm and panel degradation
- Power consumption: sum of lighting + heating + pumps + monitoring + life support
- Battery: charges from surplus solar, discharges when consumption > generation, capped at 100kWh
- Nutrient solution: pH drifts up, EC drifts down as plants absorb nutrients

### Sensors (`sensors.py`)

- **Ground truth**: exact simulation values (for frontend debug view)
- **Sensor readings**: noisy values with Gaussian noise, random spontaneous failures (2% per reading), manual sensor failure injection
- Sensor failure tracking with tick-based countdown timers
- `get_sensor_readings()` returns `null` for failed sensors — agent must handle gracefully

### Engine (`engine.py`)

- `SimulationEngine.tick(n)`: advances n ticks (each = 6 simulated hours)
- Per tick: update time → Mars environment → dust storm progression → power failure recovery → per-zone updates (lighting, temperature, crop growth, disease damage, CO2, humidity) → global resources → sensor timers
- `apply_command(cmd)`: 10 action types (adjust_irrigation, adjust_temperature, adjust_lighting, set_zone_priority, quarantine_zone, harvest_crop, plant_crop, deploy_microgreens, adjust_nutrient_solution)
- `trigger_event(type, params)`: delegates to events module

**AWS tools integrated:** None — pure Python simulation

**Issues:**
- Battery drains to 0 quickly during nighttime because power consumption exceeds solar generation and the battery is relatively small (100kWh vs ~12kW continuous draw). This is actually realistic for Mars — power management is a real constraint.

---

## Step 3: FastAPI Server + Simulation Endpoints

**Files:** `main.py`, `api/simulation_routes.py`, `api/event_routes.py`

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Root — lists all endpoints |
| GET | `/docs` | Swagger UI (auto-generated) |
| GET | `/sim/state` | Full ground-truth greenhouse state |
| GET | `/sim/sensors` | All sensor readings (noisy, for agent) |
| GET | `/sim/sensors/{zone_id}` | Sensor readings for one zone |
| POST | `/sim/tick` | Advance N ticks `{"n": 5}` |
| POST | `/sim/command` | Apply command `{"action": "...", "zone_id": "A", "params": {...}}` |
| POST | `/sim/reset` | Reset to initial state |
| GET | `/sim/nutrition` | Current nutritional coverage |
| POST | `/sim/optimize` | Run crop allocation optimizer |
| POST | `/events/dust-storm` | Trigger dust storm |
| POST | `/events/disease` | Trigger disease outbreak |
| POST | `/events/power-failure` | Trigger power reduction |
| POST | `/events/sensor-failure` | Fail a specific sensor |
| POST | `/events/crop-failure` | Kill crops in a zone |
| GET | `/events/log` | Event history |

- CORS: all origins allowed (hackathon mode)
- Shared `SimulationEngine` instance wired to all route modules at startup

**AWS tools integrated:** None — pure FastAPI

**Issues:**
- Port 8000 was occupied during first test attempt; tested on 8001 instead. Not a code bug — just a local environment issue.

---

## Step 4: Event System

**File:** `simulation/events.py`

### Crisis types implemented

| Event | Effect | Duration |
|-------|--------|----------|
| **Dust storm** | Sets dust_opacity_tau to 2.0–5.5 (Beer-Lambert attenuates solar), reduces PAR in all zones | 7–90 sols (regional vs global) |
| **Disease** | Targets a zone, drains crop health by 7 points/tick, simulates Pythium root rot | Until crops die or zone is quarantined |
| **Power failure** | Reduces power generation by specified fraction (default 50%), gradually recovers 5%/sol | Until fully recovered |
| **Sensor failure** | Makes a specific sensor return `null` in a zone | Configurable tick count (default 10) |
| **Crop failure** | Sets crop health to 0 immediately | Instant — crops are dead |

- All events are logged to `event_log` with sol, tick, description, affected zones
- Dust storm auto-recovers (opacity returns to 0.5 when remaining_sols hits 0)
- Power failure auto-recovers at 5% per sol

**AWS tools integrated:** None

**Issues:** None

---

## Step 5: Nutritional Tracking + Optimizer

**File:** `simulation/nutrition.py`

### Nutrition coverage

- Tracks 9 nutrients: Vitamin C, K, Folate, Iron, Calcium, Protein, Fiber, Potassium, Vitamin A
- Daily requirements scaled for 4 astronauts (e.g., Calcium = 1200mg × 4 = 4800mg/day — elevated for spaceflight bone density)
- `compute_nutrition_coverage()` calculates projected daily production from current crops × health × area, returns % of daily requirement per nutrient
- Reports `overall_min_coverage_percent` — the bottleneck nutrient

### Crop allocation optimizer

- **Formulation:** Minimax linear program via `scipy.optimize.linprog`
  - Decision variables: area (m²) per crop + auxiliary variable z (minimum coverage ratio)
  - Objective: maximize z
  - Constraints: for each nutrient, coverage ≥ z; total area ≤ 50m²; total water ≤ budget; total power ≤ 20kW
- Returns optimal allocation with per-crop area, daily yield, water use, power draw

**AWS tools integrated:** None — scipy only

**Issues:**
- The optimizer currently only recommends kale + soybean because the minimax formulation finds these two crops maximize the worst-case nutrient without a diversity constraint. Adding a minimum-crops constraint would require mixed-integer programming (MILP) which is more complex. For the hackathon demo, this is a known limitation — the optimizer shows the mathematical approach works, and the default 6-zone layout provides the actual diversity.

---

## Step 6: Strands Agent + MCP

**Files:** `agent/tools.py`, `agent/prompts.py`, `agent/greenhouse_agent.py`

### Agent tools (`tools.py`)

10 tool functions the agent can call:
1. `read_sensors(zone_id)` — reads noisy sensor data (never raw state)
2. `get_greenhouse_status()` — overall system summary
3. `adjust_irrigation(zone_id, rate)`
4. `adjust_temperature(zone_id, target)`
5. `adjust_lighting(zone_id, on, par, photoperiod)`
6. `set_zone_priority(zone_id, priority)`
7. `quarantine_zone(zone_id, quarantine)`
8. `harvest_crop(zone_id, crop_name)`
9. `plant_crop(zone_id, crop_name)`
10. `deploy_microgreens()`
11. `get_nutrition_status()` — nutritional coverage analysis

### System prompt (`prompts.py`)

- Agent persona: "FLORA" (Frontier Life-support Optimization & Resource Agent)
- Encodes: mission parameters, tool descriptions, decision loop, crisis protocols (dust storm triage, disease quarantine, power failure load-shedding, crop failure microgreen deployment), resource constraints, zone assignments

### Agent setup (`greenhouse_agent.py`)

- **Primary:** Strands SDK `Agent` with `BedrockModel` (Claude Sonnet)
- **Fallback:** Raw `bedrock-runtime invoke_model` if Strands SDK has issues
- MCP endpoint configured: `https://kb-start-hack-gateway-buyjtibfpg.gateway.bedrock-agentcore.us-east-2.amazonaws.com/mcp`
- Graceful degradation: if AWS creds not set, logs warning, agent endpoints return 503

**AWS tools integrated:**
- **Amazon Bedrock** — Claude Sonnet as the agent's reasoning model (`us.anthropic.claude-sonnet-4-20250514`)
- **Strands Agents SDK** — agent framework with tool-calling orchestration
- **AgentCore Gateway MCP** — endpoint configured for Syngenta knowledge base access (not yet wired as MCP client tool in Strands — needs `MCPClient` integration if time permits)

**Issues:**
- Strands SDK is not installed in the venv (only `pip install strands-agents strands-agents-tools` would add it, skipped since AWS creds aren't available for testing)
- MCP client is configured as a constant but not yet wired into the Strands Agent as an MCP tool source — the agent currently uses hardcoded crop data from `crops.py` instead of querying the Syngenta KB. This is the fallback strategy from the plan: "MCP server fails → hardcode crop knowledge from context.md"
- The fallback agent (raw Bedrock) doesn't support multi-turn tool calling — it reads status once and responds. The Strands agent would handle the full read → reason → act loop.

---

## Step 7: Agent API Endpoints

**File:** `api/agent_routes.py`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/agent/tick` | Run one agent decision cycle (reads state, reasons, acts) |
| POST | `/agent/query` | Natural language query to the agent `{"message": "..."}` |
| GET | `/agent/decisions` | Decision history log (last N entries) |

- Returns 503 with clear message when AWS creds not configured
- Decision log stored both in-memory and appended to `GreenhouseState.agent_decisions`

**AWS tools integrated:**
- **Amazon Bedrock** (via agent) — powers the reasoning behind each decision
- **Strands SDK** (via agent) — orchestrates tool calls

**Issues:** None — endpoints work correctly, returning proper 503 when agent isn't available

---

## Step 8: Next.js Proxy Config

**File:** `next.config.ts`

Rewrites configured:
```
/api/sim/*     → http://localhost:8000/sim/*
/api/agent/*   → http://localhost:8000/agent/*
/api/events/*  → http://localhost:8000/events/*
/api/auto-tick/* → http://localhost:8000/auto-tick/*
```

This means the frontend can call `fetch('/api/sim/state')` and it transparently proxies to the Python backend. No CORS issues in production since requests go through the same origin.

**AWS tools integrated:** None

**Issues:** None — standard Next.js rewrites

---

## Step 9: Auto-Tick Demo Loop + SSE

**File:** `main.py` (added to existing)

### Auto-tick control

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auto-tick/start?interval=2.0` | Start background tick loop (0.1–30s interval) |
| POST | `/auto-tick/stop` | Stop the loop |
| GET | `/auto-tick/status` | Check if running and current interval |

### SSE stream

| Method | Path | Description |
|--------|------|-------------|
| GET | `/sim/stream` | Server-Sent Events stream |

- Auto-tick runs as an `asyncio.Task`, ticking the simulation every N seconds
- Each tick broadcasts a state snapshot to all SSE subscribers via `asyncio.Queue`
- SSE format: `data: {"sol": 5, "tick": 2, "water_reservoir_l": 985.3, ...}\n\n`
- Queue size capped at 50; slow subscribers get dropped messages (not blocked)

**AWS tools integrated:** None

**Issues:** None

---

## AWS Integration Summary

| AWS Service | Status | Where Used |
|-------------|--------|------------|
| **Amazon Bedrock (Claude Sonnet)** | Configured, needs creds | `agent/greenhouse_agent.py` — agent reasoning |
| **Strands Agents SDK** | Configured, needs install + creds | `agent/greenhouse_agent.py` — agent orchestration |
| **AgentCore Gateway MCP** | Endpoint stored, not wired as tool source | `agent/greenhouse_agent.py` — Syngenta KB access |
| **AgentCore Memory** | Not implemented | Could store agent decisions for cross-session learning |
| **AgentCore Policy** | Not implemented | Could enforce safety limits (min water, power reserves) |
| **Bedrock Knowledge Bases (RAG)** | Not implemented | Could replace hardcoded crop data with vector search |
| **AWS Amplify** | Not implemented | Frontend deployment (separate task) |
| **S3** | Not implemented | Could store simulation logs |

### To activate AWS features:

```bash
export AWS_DEFAULT_REGION="us-west-2"
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_SESSION_TOKEN="..."

cd backend
source .venv/bin/activate
pip install strands-agents strands-agents-tools boto3
uvicorn main:app --reload --port 8000
```

The agent will auto-initialize on startup if credentials are valid.

---

## Known Limitations / Future Work

1. **Optimizer diversity** — only recommends 2 crops without a diversity constraint
2. **MCP client not wired** — agent uses hardcoded crop data, not the Syngenta KB
3. **No AgentCore Memory** — agent doesn't learn from past decisions
4. **No AgentCore Policy** — safety limits are in code, not enforced at gateway level
5. **Battery drains fast** — realistic but makes nighttime operations challenging
6. **Disease doesn't spread** — only affects the targeted zone, no cross-zone water contamination modeled
7. **No crop replanting cycle** — harvested crops stay at biomass=0 until manually replanted
8. **Sensor staleness not implemented** — readings are either fresh-with-noise or null (no delayed values)

---

## How to Run

```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000
# Open http://localhost:8000/docs for Swagger UI
```

### Quick test sequence

```bash
# Check state
curl localhost:8000/sim/state

# Advance 10 ticks (2.5 sols)
curl -X POST localhost:8000/sim/tick -H "Content-Type: application/json" -d '{"n":10}'

# Trigger dust storm
curl -X POST localhost:8000/events/dust-storm -H "Content-Type: application/json" -d '{}'

# Check nutrition
curl localhost:8000/sim/nutrition

# Start auto-tick (1 tick every 2 seconds)
curl -X POST "localhost:8000/auto-tick/start?interval=2"

# Listen to SSE stream
curl -N localhost:8000/sim/stream
```
