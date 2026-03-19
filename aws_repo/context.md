# Mars Greenhouse AI Agent — Complete Project Context

## Table of Contents
1. [Hackathon Overview](#1-hackathon-overview)
2. [The Challenge](#2-the-challenge)
3. [Mission Parameters & Hard Constraints](#3-mission-parameters--hard-constraints)
4. [Mars Environmental Constraints](#4-mars-environmental-constraints)
5. [Greenhouse Assumptions](#5-greenhouse-assumptions)
6. [Data Provided by Syngenta](#6-data-provided-by-syngenta)
7. [AWS Technology Stack — What We Must Use](#7-aws-technology-stack--what-we-must-use)
8. [System Architecture](#8-system-architecture)
9. [Core Agent Loop — What the Agent Must Do](#9-core-agent-loop--what-the-agent-must-do)
10. [Creative Feature Ideas — Status & Priority](#10-creative-feature-ideas--status--priority)
11. [Nutritional Optimization Model](#11-nutritional-optimization-model)
12. [Plant Disease Model](#12-plant-disease-model)
13. [Sensor Simulation Model](#13-sensor-simulation-model)
14. [Dashboard / Frontend Requirements](#14-dashboard--frontend-requirements)
15. [Pitch Strategy](#15-pitch-strategy)
16. [Judging Criteria](#16-judging-criteria)
17. [Candidate Crops](#17-candidate-crops)
18. [Open Questions & Unresolved Decisions](#18-open-questions--unresolved-decisions)
19. [Time Budget](#19-time-budget)

---

## 1. Hackathon Overview

- **Event:** StartHack 2026
- **Sponsor:** Syngenta (global AgTech company, 100+ countries, AI-driven crop protection, precision seeding, regenerative agriculture)
- **Case Name:** "Agriculture's Next Frontier: Feeding Humans on the Red Planet"
- **Team Size:** ~4-5 people
- **Duration:** ~24 hours
- **Prize:** Trip to Amsterdam — visit Syngenta's TomatoVision R&D center, pitch to Syngenta leaders, flights/accommodation/meals provided
- **Deliverables:**
  1. A **3-minute PowerPoint presentation** (concise pitch, architecture, key features, why innovative/feasible)
  2. A **working simulation or digital twin** of the Martian greenhouse demonstrating the AI agent in action
- **Hard requirement:** There MUST be a working agent system behind the PoC/simulation. Not just a UI.

---

## 2. The Challenge

Design an autonomous AI agent system to manage a Martian greenhouse that supplements the diet of a crew of 4 astronauts for a 450-day surface-stay mission on Mars.

**The aim is to:**
- Maximize nutrient output
- Ensure dietary balance
- Minimize resource consumption

**The system must:**
1. Monitor and control the environment (temperature, humidity, light, water)
2. Manage resources (efficiently use and recycle water, nutrients, energy)
3. Detect and respond to plant stress (nutrient deficiencies, disease, automated responses)
4. Optimize crop growth and adapt over time (learn from outcomes)

**Users of the solution:**
- NASA planners
- Syngenta scientists (for autonomous cropping systems on Earth in extreme settings)

---

## 3. Mission Parameters & Hard Constraints

| Parameter | Value |
|---|---|
| Crew size | 4 astronauts |
| Mission duration | 450 days on Mars surface |
| Travel time to Mars | Up to 9 months each way |
| Growing area | ~50–100 m² (tunable parameter) |
| Power budget | ~10–30 kW total greenhouse (tunable) |
| Water budget | ~500–2,000 L initial allocation (tunable), 85–95% recycling efficiency |
| Goal | Maximize nutrient output + balanced diet |
| Constraints | Minimal resource use, minimal astronaut time |
| Communication delay | 4–24 minutes one-way to Earth |
| Resupply | None — everything brought from Earth or recycled |
| Crop transport | Seeds (surface-sterilized, but imperfect sterilization) |
| Food strategy | Greenhouse SUPPLEMENTS packaged food, does not fully replace it |

---

## 4. Mars Environmental Constraints

These must be modeled in the simulation:

| Parameter | Value | Implication |
|---|---|---|
| Surface gravity | 3.72 m/s² (38% of Earth) | Water behaves differently — clings to roots longer, capillary action stronger |
| Atmospheric pressure | ~610 Pa (<1% of Earth) | Greenhouse must be pressurized |
| Atmosphere | ~95% CO₂, 2.6% N₂, 0.13% O₂ | CO₂ is a FREE resource for plant growth enrichment |
| Temperature | -60°C average, swings -125°C to +20°C | Greenhouse must maintain 20–25°C internally, heating costs energy |
| Solar irradiance | ~590 W/m² (43% of Earth) | Reduced light, further reduced by dust storms |
| Sol length | 24h 37min | Similar to Earth day, manageable photoperiods |
| Radiation | No magnetosphere, no ozone, high UV + GCR + SPE | Plants need radiation shielding, BUT radiation events can be used to trigger antioxidant boosting via UV-B LEDs |
| Dust | Fine pervasive regolith, perchlorates in soil | Toxic soil → must use hydroponics/aeroponics, dust storms block sunlight |
| Water | No rainfall, must extract from ice or recycle | Closed-loop water system critical |
| Dust storms | Regional: 1–2 weeks, 40–80% light reduction. Global: 1–3 months, up to 99% light reduction | The agent must triage crops during storms |

---

## 5. Greenhouse Assumptions

- Pressurized, sealed habitat (inflatable or rigid dome)
- Hydroponic or aeroponic growing systems (no Martian soil — perchlorates are toxic)
- Artificial lighting: LED arrays tuned per crop, 16–20 hour photoperiods, PAR 200–600 µmol/m²/s
- Closed-loop water recycling (evapotranspiration capture, condensation, filtration)
- Controlled internal atmosphere: Earth-like O₂/CO₂/N₂ mix, CO₂ enrichment from Martian atmosphere for photosynthesis boost
- Limited power: solar + battery (possibly nuclear RTG)
- Limited physical space: every m² counts, vertical/stacked growing is desirable
- No pesticides, no insect biocontrol agents
- Crew members are a disease vector (human microbiome introduced during greenhouse entry)

---

## 6. Data Provided by Syngenta

Syngenta provides a knowledge base with:

1. **Mars environmental data** — Gravity, daylight hours, sunlight intensity, atmospheric conditions, soil properties, etc. (as MD files)
2. **Crop data** — Yield, growth and harvest cycle, nutrition and water requirements, optimum environmental conditions, response to abiotic stressors
3. **Human needs** — Nutritional and resource requirements for a crew of 4 astronauts

These are provided as **MD files** accessible through a **public MCP server**.

Participants are welcome to use other publicly available datasets (USDA FoodData Central, NASA APIs, etc.).

---

## 7. AWS Technology Stack — What We Must Use

### 7.1 Required / Strongly Expected

**AWS AgentCore Gateway** (PRIMARY TOOL — Syngenta is providing this)
- Transforms APIs, Lambda functions, and MCP servers into agent-ready tools
- Unified interface for all data sources
- Your agent sends tool calls → Gateway routes them to the right backend
- Also enforces safety policies (Policy layer) in real time
- This is a HARD REQUIREMENT — judges explicitly score on "Usage of the provided AWS AgentCore system"

**Amazon Bedrock Knowledge Bases (RAG)**
- Upload Syngenta's MD files + any additional data (USDA, NASA) to S3
- Bedrock automatically chunks, embeds, stores in a vector DB
- Agent queries the KB to get grounded, cited answers about crops, Mars conditions, nutrition
- Use `RetrieveAndGenerate` API for augmented LLM responses
- Critical for applicability/accuracy — every agent decision should be grounded in real data

**Amazon Bedrock Foundation Models**
- The agent's "brain" — use Claude Sonnet (complex reasoning) or Claude Haiku (fast simple checks)
- Could use both: Haiku as fast "reflex" layer, Sonnet as "deliberation" layer

**Amazon S3**
- Store all data files that feed into the Bedrock Knowledge Base
- Store simulation logs, exported reports, additional datasets

**Public MCP Server (provided by Syngenta)**
- Exposes the Syngenta knowledge base as tool calls
- Agent calls tools like `get_crop_data(crop_name)`, `get_mars_environment(parameter)` etc.
- Accessed through AgentCore Gateway

### 7.2 Strongly Recommended (Extra Credit)

**AgentCore Memory**
- Episodic + semantic memory for the agent
- Agent remembers past decisions and outcomes
- "On Sol 47, increased watering by 15% → yield improved 8%" → agent applies this on Sol 120
- This is the "learn over time" requirement

**AgentCore Policy**
- Natural language safety rules enforced deterministically at Gateway level
- Examples: "Never reduce water below X L/day", "Reserve 20% power for life support"
- Maps to the failsafe architecture
- Enforced OUTSIDE agent code — LLM hallucination can't bypass these

**AgentCore Runtime**
- Hosted execution environment for the agent
- Session isolation, scaling, up to 8-hour execution windows
- Professional architecture vs running on localhost

**AgentCore Observability**
- Dashboards via CloudWatch for agent metrics
- Decision traces, token usage, error rates
- Low priority for hackathon, mention in architecture slide

**AgentCore Evaluations**
- 13 pre-built evaluation metrics (correctness, safety, tool selection)
- Only if time permits — quantify agent performance for the pitch

### 7.3 Frontend Deployment

**AWS Amplify Gen 2**
- Fullstack deployment platform for the React/Next.js dashboard
- Connect Git repo → auto-deploy on every push → live URL
- Can also provision: Auth (Cognito), Data (AppSync + DynamoDB for real-time), Functions (Lambda), Storage (S3)
- Key benefit: live deployed URL judges can open on their phones, not just localhost
- AppSync real-time subscriptions: sensor readings and agent decisions stream to dashboard without polling
- Setup: `npm create amplify@latest` in the React project, define backend in TypeScript

### 7.4 Architecture Diagram

```
┌──────────────────────────────────────────────────────┐
│          AWS Amplify Gen 2 (Hosting + CI/CD)          │
│                                                        │
│   React Dashboard (live deployed URL)                  │
│   ┌────────────┐ ┌──────────────┐ ┌───────────────┐  │
│   │ Sensor     │ │ Nutrition    │ │ Crisis/Triage │  │
│   │ Display    │ │ Heatmap      │ │ Controls      │  │
│   └────────────┘ └──────────────┘ └───────────────┘  │
│                                                        │
│   Optional: Cognito Auth, AppSync real-time,           │
│             DynamoDB state, Lambda API routes           │
└────────────────────────┬─────────────────────────────┘
                         │ REST / WebSocket / AG-UI
                         ▼
┌──────────────────────────────────────────────────────┐
│            AgentCore Runtime (Agent Host)              │
│                                                        │
│   ┌──────────────────┐    ┌────────────────────────┐ │
│   │  Greenhouse Agent │    │   AgentCore Memory     │ │
│   │  (LangGraph /     │◄──►│   (episodic learning)  │ │
│   │   Strands /       │    └────────────────────────┘ │
│   │   CrewAI)         │                                │
│   └────────┬──────────┘                                │
│            │ tool calls                                │
│            ▼                                           │
│   ┌──────────────────────────────────────────────┐   │
│   │         AgentCore Gateway                     │   │
│   │   ┌──────────┐ ┌───────────┐ ┌──────────┐   │   │
│   │   │  Policy   │ │ MCP Server│ │ Lambda   │   │   │
│   │   │ (safety)  │ │(Syngenta) │ │ (custom) │   │   │
│   │   └──────────┘ └─────┬─────┘ └──────────┘   │   │
│   └───────────────────────┼──────────────────────┘   │
│                           │                            │
│   AgentCore Observability (CloudWatch traces)          │
└───────────────────────────┼────────────────────────────┘
                            ▼
┌──────────────────────────────────────────────────────┐
│         Bedrock Knowledge Base (RAG)                  │
│   S3 → Chunking → Embeddings → Vector DB              │
│                                                        │
│   Data sources:                                        │
│   - Syngenta crop profiles (MD files)                  │
│   - Mars environmental data (MD files)                 │
│   - Human nutritional requirements                     │
│   - USDA FoodData Central (additional)                 │
│   - NASA Mars weather API cache (additional)           │
└──────────────────────────────────────────────────────┘
```

---

## 8. System Architecture

### 8.1 Agent Framework Choice (UNDECIDED)

Options:
- **LangGraph** — graph-based agent orchestration, good for complex multi-step workflows
- **Strands Agents** — AWS-native agent framework, tightest AgentCore integration
- **CrewAI** — multi-agent system, could have specialized sub-agents (sensor agent, nutrition agent, resource agent)
- **OpenAI Agents SDK** — mentioned as available
- **Raw function-calling** — simplest, just Claude + tool definitions, no framework overhead

**Recommendation for hackathon:** Use Strands Agents if documentation is clear (AWS-native = best AgentCore integration). Fall back to LangGraph or raw function-calling if Strands has friction.

### 8.2 Agent Decision Loop

The core loop the agent executes every simulation "tick" (e.g., every simulated day or every few hours):

```
1. READ SENSORS
   - Environment: temperature, humidity, CO₂, O₂, light levels, pressure
   - Plant health: growth rate, leaf color (NDVI proxy), stress indicators
   - Resources: water reservoir level, nutrient solution pH/EC, power generation/consumption
   - External: dust storm probability, solar irradiance forecast

2. QUERY KNOWLEDGE BASE (via AgentCore Gateway → Bedrock KB)
   - Look up optimal ranges for current crops at current growth stage
   - Check nutritional targets vs current projected harvest

3. REASON (Bedrock FM — Claude)
   - Compare sensor readings to optimal ranges
   - Identify anomalies, stress signals, resource shortages
   - Run/update the optimization model if crops have changed
   - Check if any crisis conditions are active (storm, disease, crop failure)

4. DECIDE & ACT (tool calls via Gateway, checked by Policy)
   - Adjust environmental controls: temperature setpoint, humidity, CO₂ level
   - Adjust lighting: spectrum, intensity, photoperiod per zone
   - Adjust irrigation: flow rate, nutrient concentration, pH correction
   - Plant/harvest decisions: start new planting cycle, harvest mature crops
   - Triage decisions: sacrifice/hibernate/protect zones during storms
   - Emergency responses: deploy microgreen trays, quarantine diseased sections

5. LOG & LEARN (AgentCore Memory)
   - Store the decision and its reasoning
   - After outcomes are observed, store the result
   - Build episodic memory: "action X in context Y led to outcome Z"

6. UPDATE DASHBOARD (via API → Amplify frontend)
   - Push new sensor readings, agent decisions, nutrition status
   - Update visualizations in real time
```

### 8.3 Simulation Engine

Since we don't have a real greenhouse, we need a **simulation** that models:
- Plant growth over time (growth curves per crop, affected by light/water/temperature/nutrients)
- Resource consumption and recycling (water balance, nutrient depletion, power budget)
- Environmental dynamics (temperature drift if heating fails, CO₂ buildup, humidity changes)
- Random/triggered events (dust storms, equipment failures, disease outbreaks)
- Nutritional output calculation (grams harvested × nutritional profile per crop)

The simulation should run in **accelerated time** — simulating 450 days in minutes for the demo. The agent interacts with the simulation as if it were real sensors and actuators.

**Implementation approach:**
- Python backend that models greenhouse state as a set of differential equations or discrete-time steps
- State includes: per-zone crop status, growth stage, health, environmental readings, resource levels
- Agent calls simulation API endpoints (wrapped as tools via Gateway) to read state and issue commands
- Simulation advances time and returns updated state
- Frontend subscribes to state updates and renders in real time

---

## 9. Core Agent Loop — What the Agent Must Do

### 9.1 Environmental Control

The agent maintains optimal growing conditions per zone:

| Parameter | Target Range | Adjustment Mechanism |
|---|---|---|
| Air temperature | 20–25°C (varies by crop) | Heating/cooling system |
| Root zone temperature | 18–22°C | Nutrient solution temperature control |
| Relative humidity | 60–75% | Ventilation, dehumidification |
| CO₂ concentration | 1,000–1,500 ppm | Intake valve from Martian atmosphere (free CO₂) |
| O₂ concentration | ~21% | Balanced by plant photosynthesis + crew respiration |
| Light (PAR) | 200–600 µmol/m²/s (crop-dependent) | LED array intensity control |
| Light spectrum | Red/Blue/Far-red/UV-B ratios | LED spectrum tuning per growth stage |
| Photoperiod | 16–20 hours (crop-dependent) | LED on/off scheduling |
| Air pressure | ~101 kPa (Earth standard) | Pressure monitoring for leak detection |
| Airflow | Gentle circulation | Fan speed control |

### 9.2 Resource Management

| Resource | Tracking | Management Strategy |
|---|---|---|
| Water | Reservoir level, daily consumption, recycling rate | Closed-loop: evapotranspiration → condensation → filtration → reservoir |
| Nutrient solution | pH (target 5.5–6.5), EC (crop-dependent), individual ion levels | Predictive depletion model, targeted micro-additions from stock solutions |
| Power | Solar generation, battery state, consumption by subsystem | Dynamic allocation: lighting vs heating vs life support |
| Seeds | Inventory per crop, germination rates | Track remaining stock, plan succession planting |
| Nutrient salts | Concentrated stock solution volumes | Conserve, predict depletion |
| Growing medium | Hydroponic channels/aeroponic chambers | Monitor for biofilm, contamination |

### 9.3 Plant Health Monitoring

| Indicator | Sensor/Method | What It Detects |
|---|---|---|
| Growth rate | Weight/load cells, camera-based measurement | Overall health, nutrient status |
| Leaf color / NDVI | Multispectral/RGB camera | Nutrient deficiency, chlorosis, disease |
| Chlorophyll fluorescence | Fluorescence sensor (Fv/Fm) | Photosynthetic stress |
| Leaf temperature | Thermal camera | Water stress (stomatal closure → leaf warming) |
| Root health | DO sensor, visual inspection, EC drift | Root rot, pathogen presence |
| VOC emissions | Electronic nose / VOC sensor | Stress signaling, disease, ethylene (ripening) |
| Biomass | Load cells under trays | Growth tracking, harvest readiness |

### 9.4 Crisis Response Protocols

**Dust Storm Protocol:**
1. Detect incoming dust event (opacity sensor trend, weather forecast)
2. Classify crops into 3 tiers:
   - Tier 1 (Protect): Near-harvest crops → redirect LED power to these
   - Tier 2 (Hibernate): Mid-growth crops → reduce temperature, slow irrigation, dim lights
   - Tier 3 (Sacrifice): Seedlings with minimal investment → shut off lighting
3. Shift power budget from lighting to life support (heating, atmosphere)
4. After storm: assess damage, replant Tier 3 losses, resume normal operation

**Disease Outbreak Protocol:**
1. Detect anomaly (sensor deviation, visual signs)
2. Quarantine affected zone (stop water circulation to/from that zone)
3. Treat water with UV-C sterilization / H₂O₂ injection
4. If irrecoverable: remove infected plants, sterilize zone, replant
5. Deploy microgreen emergency trays to cover nutritional gap

**Power Failure Protocol:**
1. Cut all non-essential loads immediately
2. Maintain only: atmosphere (pressure, O₂), minimal heating, monitoring
3. Plants survive days without light at reduced temperature
4. Prioritize restoring power to near-harvest crops first

**Crop Failure Protocol:**
1. Detect: projected harvest will miss nutritional targets
2. Identify which nutrients are at risk
3. Deploy targeted microgreen trays (7–14 days to harvest, high nutrient density)
4. Rebalance planting plan for next cycle

---

## 10. Creative Feature Ideas — Status & Priority

### 10.1 CONFIRMED — Will Implement

| # | Feature | Description | Build Time | Scoring Impact |
|---|---|---|---|---|
| 1 | **Storm Triage Protocol** | 3-tier crop classification during dust storms, visual dashboard transition to "storm mode" | 3–4h | Creativity + Applicability |
| 2 | **Nutritional Optimization Model** | Constrained optimization: maximize nutritional coverage subject to space/water/power budgets. Uses real USDA data. | 4h | Applicability (core value prop) |
| 3 | **Working Agent Loop** | Agent reads sensors → queries KB → reasons → acts → updates state. Tool-calling through AgentCore Gateway. Hard requirement. | 3–4h | Applicability (mandatory) |
| 4 | **Live Demo Dashboard** | React dashboard with sensor display, nutrition heatmap, triage UI, interactive controls to trigger events | 4–6h | Ease of Use (25%) |
| 5 | **Microgreen Emergency Lanes** | Agent detects crop failure → autonomously deploys fast-growing microgreen trays to fill nutritional gaps in 7–14 days | 2–3h | Creativity + Applicability |
| 6 | **Failsafe Architecture via AgentCore Policy** | Hard safety limits enforced at Gateway level, agent can't override | 1–2h | Applicability |

### 10.2 LIKELY — Will Implement If Time Permits

| # | Feature | Description | Build Time | Scoring Impact |
|---|---|---|---|---|
| 7 | **CO₂ Enrichment from Mars Atmosphere** | Mars is 95% CO₂ — free photosynthesis boost. Agent dynamically adjusts CO₂ intake valve synchronized with light cycle. | 2h | Creativity |
| 8 | **Photomorphogenic Light Control** | Agent adjusts LED spectrum per growth stage. UV-B pulse before harvest → boosts antioxidants by 20–50%. Tied to radiation events. | 3h | Creativity (visually stunning in UI with color changes) |
| 9 | **Closed-Loop O₂/CO₂ Habitat Integration** | Greenhouse as biological air processor. Agent manages gas exchange between crew habitat and greenhouse. | 2–3h | Applicability |
| 10 | **Adaptive Learning via AgentCore Memory** | Agent stores episodic memories of decisions and outcomes, applies lessons to future decisions | 2h | Creativity + Applicability |

### 10.3 NOT SET IN STONE — Needs Decision

| # | Feature | Status | Concern |
|---|---|---|---|
| 11 | **Astronaut Morale Module** | UNDECIDED | Very creative (no other team will do this), but is it worth build time? Could be just a soft constraint in the optimization (diversity per week, "treat crops" like strawberries). Low effort if just a parameter, higher effort if full feature. |
| 12 | **0.38g Irrigation Adaptation** | UNDECIDED | Scientifically interesting (water clings to roots 2.6× longer → irrigate less frequently), but hard to demo visually. Maybe just mention in pitch rather than build. |
| 13 | **Thermal Mass Buffering** | UNDECIDED | Agent overheats water reservoir during day (solar surplus) to release heat at night. Nice systems thinking, but marginal demo impact. |
| 14 | **Predictive Nutrient Solution Management** | UNDECIDED | Agent predicts ion depletion 3–7 days ahead based on crop uptake curves. Makes targeted micro-additions. Very applicable to real-world hydroponics, but needs ion uptake data we may not have. |
| 15 | **NASA API Integration** | UNDECIDED | Pull real Mars InSight weather data into simulation. Adds credibility but is it worth the integration time? |
| 16 | **Small Model / Edge Deployment Narrative** | PITCH ONLY | Won't actually run a local model, but mention in architecture that system is designed for edge deployment (4–24 min comms delay makes cloud impossible). Use fast model (Haiku) as proxy in demo. |
| 17 | **Open Source** | TRIVIAL | Just put repo on GitHub with MIT license. 10 min. Nice narrative but won't score points directly. |
| 18 | **SpaceX Mars Context** | PITCH ONLY | Opening slide narrative. No code needed. |

---

## 11. Nutritional Optimization Model

### 11.1 Problem Formulation

**Decision variables:** x_i = area (m²) allocated to crop i

**Objective:** Maximize the minimum nutritional coverage across all required nutrients (minimax formulation — so no single nutrient is a bottleneck):

```
max min_j ( Σ_i  n_ij · y_i · x_i ) / R_j
```

Where:
- n_ij = amount of nutrient j per gram of crop i (from USDA data)
- y_i = yield of crop i in g/m²/day (from hydroponic data)
- x_i = area allocated to crop i
- R_j = daily requirement of nutrient j for 4 astronauts

**Constraints:**
- Σ x_i ≤ A_total (total growing area)
- Σ w_i · x_i ≤ W_budget (daily water budget, w_i = water use per m² for crop i)
- Σ p_i · x_i ≤ P_budget (power budget for lighting, p_i = power per m² for crop i's light needs)
- x_i ≥ 0 for all i
- At least N different crops (diversity constraint)
- Optional: minimum area per crop if selected (binary selection makes this MILP)

**This can be solved with:**
- scipy.optimize.linprog (if linearized)
- scipy.optimize.minimize (for nonlinear minimax)
- Or even a simple greedy heuristic for the hackathon

### 11.2 Data Sources Needed

- **USDA FoodData Central**: Nutritional profiles per 100g for all candidate crops (API available, or download CSV)
- **Hydroponic yield data**: g/m²/day for each crop in controlled environment (compile from papers or use estimates)
- **NASA Spaceflight Nutritional Requirements**: Daily requirements adjusted for spaceflight (higher Ca, vitamin D, antioxidants)
- **Water use efficiency**: L/kg edible biomass per crop in hydroponics

### 11.3 Key Nutrients to Track (Priority Order)

Critical (degrade in packaged food, greenhouse must provide):
1. Vitamin C (ascorbic acid) — degrades fastest in storage
2. Vitamin K — leafy greens are the only good source
3. Folate (B9) — degrades in storage
4. Fiber — inadequate in most packaged space food
5. Potassium — cardiovascular health, hard to get from packaged food

Important (greenhouse helps but packaged food also provides):
6. Vitamin A (as beta-carotene)
7. Iron (non-heme, needs vitamin C for absorption)
8. Calcium (bone density in low gravity)
9. Protein (soy, legumes, grains)
10. Calories (potatoes, sweet potatoes, wheat — but greenhouse likely can't provide 100%)

Cannot be provided by greenhouse:
- Vitamin B12 (no plant source, must come from packaged food or supplements)
- Vitamin D (must come from supplements; mushrooms + UV-B can provide D₂ but unreliable)
- Complete fat profile (omega-3 DHA/EPA — only from algae or supplements)

---

## 12. Plant Disease Model

### 12.1 Diseases That CAN Realistically Occur

In a sealed hydroponic Mars greenhouse with seed-transported crops:

**HIGH RISK (model these in simulation):**

| Pathogen | Type | Entry Route | Affects | Speed |
|---|---|---|---|---|
| Pythium spp. (P. aphanidermatum, P. ultimum) | Oomycete | Survives on seeds, colonizes recirculating water | ALL crops (root rot) | Fast — days to spread via shared water |
| Fusarium oxysporum | Fungus | Seed-borne, endophytic | Tomatoes, lettuce, spinach (vascular wilt) | Moderate — weeks |
| Botrytis cinerea (gray mold) | Fungus | Spores survive on organic debris, high humidity | Lettuce, strawberries, tomatoes | Moderate, humidity-dependent |
| Biofilm contamination | Bacterial mix | Develops naturally in recirculating water | System efficiency, root health | Slow buildup over weeks |

**MEDIUM RISK (mention in pitch, maybe model):**

| Pathogen | Type | Entry Route | Affects |
|---|---|---|---|
| Rhizoctonia solani | Fungus | Seed-borne | Seedlings (damping-off) |
| Pectobacterium / Dickeya | Bacteria | Seed-borne or human-introduced | Soft rot in warm wet conditions |
| Alternaria spp. | Fungus | Seed-borne | Leaf spots on brassicas, tomatoes |
| Human-associated (Aspergillus, Penicillium) | Fungus | Astronaut entry | Opportunistic on stressed plants |
| Algal overgrowth | Algae | Develops in lit water systems | Nutrient competition, O₂ depletion |

**CANNOT OCCUR (excluded):**
- Insect-vectored viruses (no insects on Mars)
- Soil nematode diseases (no soil)
- Wind-borne external spore diseases (sealed environment)
- Most bacterial wilt from contaminated irrigation water from natural sources

### 12.2 Disease Management Without Pesticides

The agent's tools for disease response:
1. UV-C sterilization of recirculating nutrient solution
2. Hydrogen peroxide (H₂O₂) injection into water system
3. Ozonation of water
4. Environmental control: reduce humidity below 60% to suppress Botrytis, increase airflow
5. Quarantine: isolate affected zone's water circuit
6. Sacrifice: remove infected plants, sterilize zone, replant
7. Biological control: Trichoderma spp., Bacillus subtilis (if brought as freeze-dried inoculants)
8. Resistant cultivar selection (pre-mission crop variety choice)

---

## 13. Sensor Simulation Model

For the simulation, we need to model these sensor types (returning realistic values the agent reads):

### 13.1 Environmental Sensors
| Sensor | Unit | Typical Range | Update Frequency |
|---|---|---|---|
| Air temperature | °C | 18–28 | Every 5 min |
| Root zone temperature | °C | 16–24 | Every 5 min |
| Relative humidity | % | 50–85 | Every 5 min |
| CO₂ concentration | ppm | 400–2000 | Every 5 min |
| O₂ concentration | % | 19–23 | Every 15 min |
| Atmospheric pressure | kPa | 99–103 | Every 15 min |
| PAR (per zone) | µmol/m²/s | 0–800 | Every 5 min |
| External solar irradiance | W/m² | 0–590 (reduced by dust) | Every 30 min |
| Dust opacity (tau) | dimensionless | 0.3–5.0 (>2.0 = storm) | Every 30 min |

### 13.2 Plant Health Sensors (per zone)
| Sensor | Unit | Typical Range | Meaning |
|---|---|---|---|
| Growth rate | g/day | 0–50 (zone total) | Overall health indicator |
| NDVI proxy | 0–1 | 0.6–0.9 healthy, <0.5 stressed | Chlorophyll/nutrient status |
| Leaf temperature delta | °C above air temp | 0–3 normal, >5 = water stress | Stomatal closure indicator |
| Fv/Fm (chlorophyll fluorescence) | ratio | 0.75–0.85 healthy, <0.7 stressed | Photosynthetic efficiency |
| Plant health score | 0–100 | Composite of above | Summary metric for dashboard |

### 13.3 Nutrient/Water Sensors
| Sensor | Unit | Typical Range |
|---|---|---|
| Water reservoir level | L | 0–2000 |
| Nutrient solution pH | pH units | 5.0–7.0 (target 5.5–6.5) |
| Electrical conductivity (EC) | mS/cm | 1.0–3.0 (crop-dependent) |
| Dissolved oxygen (DO) | mg/L | 5–10 |
| Water temperature | °C | 18–24 |
| Water flow rate | L/min | 0–5 per zone |

### 13.4 Power/Resource Sensors
| Sensor | Unit | Typical Range |
|---|---|---|
| Solar power generation | kW | 0–30 (depends on dust) |
| Battery state of charge | % | 0–100 |
| Total power consumption | kW | 5–30 |
| Power by subsystem | kW | Lighting, heating, pumps, monitoring |

---

## 14. Dashboard / Frontend Requirements

### 14.1 Overall Design Philosophy
- **Glanceable**: 3 questions answered in 3 seconds — are plants healthy? Am I on track nutritionally? Is anything wrong?
- **One unified dashboard**, not multiple screens
- **Color-coded with semantic meaning**: Green = healthy/on-track, Yellow = attention, Red = critical
- **Dark theme** recommended (space/Mars aesthetic, also easier on eyes for long hackathon demo)
- **Professional, not hackathon-y**: use a consistent component library (shadcn/ui, Tailwind)
- **Responsive**: should work on projector AND on judges' phones if using Amplify deploy

### 14.2 Dashboard Sections

**Section 1: Greenhouse Overview (top)**
- Visual representation of greenhouse zones (grid or floor plan)
- Each zone shows: crop planted, growth stage, health indicator (color), days to harvest
- Click a zone to see detailed sensors

**Section 2: Nutrition Tracker (prominent)**
- Heatmap: rows = nutrients (Vitamin C, K, Folate, Iron, Calcium, Protein, Fiber, etc.)
- Columns = days (past 7 days + projected 14 days)
- Cell color = % of daily requirement met (green >80%, yellow 50–80%, red <50%)
- This is the visual judges will screenshot

**Section 3: Resource Gauges**
- Water level (tank gauge visual)
- Power generation vs consumption (stacked bar or gauge)
- Nutrient solution status (pH, EC)
- Days of seed inventory remaining

**Section 4: Agent Activity Feed**
- Chronological log of agent decisions with reasoning
- "Sol 47: Increased irrigation in Zone B by 15%. Reason: Leaf temperature delta exceeded 4°C, indicating water stress. Knowledge Base confirms lettuce requires additional 0.5 L/m²/day at current growth stage."
- Color-coded by severity

**Section 5: Alert/Crisis Panel**
- Normally hidden or minimized
- When crisis triggers: expands, shows triage classification, storm timeline, affected zones
- "DUST STORM DETECTED — Estimated duration: 12 days. Triage active. 3 zones protected, 2 hibernating, 1 sacrificed."

**Section 6: Controls (for demo interaction)**
- Button: "Trigger Dust Storm"
- Button: "Inject Disease (Pythium root rot in Zone C)"
- Button: "Power Failure (50% reduction)"
- Slider: Simulation speed (1x, 10x, 100x)
- These let the presenter trigger crisis scenarios live during the 3-minute pitch

### 14.3 Tech Stack for Frontend
- **React** (or Next.js) with TypeScript
- **Tailwind CSS** for styling
- **shadcn/ui** or similar component library
- **Recharts** or **Chart.js** for data visualization
- **Deployed via AWS Amplify Gen 2** (live URL)
- **Real-time updates** via AppSync subscriptions (ideal) or polling (fallback)

---

## 15. Pitch Strategy

### 15.1 Structure (3 minutes = ~7-8 slides max)

**Slide 1 (20 sec) — The Hook**
"In 2035, four astronauts will land on Mars. By month 6, their packaged vitamin C will have degraded by 50%, their folate by 70%. If they can't grow fresh food, they'll develop scurvy before they come home. We built the system that prevents that."

**Slide 2 (30 sec) — Architecture Overview**
One clean diagram. Agent → sensors → KB → reasoning → actions → simulation → dashboard. Mention AWS stack (AgentCore, Bedrock KB, Amplify). Don't explain every component verbally.

**Slide 3 (30 sec) — The Optimization Engine**
Flash the crop selection result. "Our agent solves a constrained optimization: maximize nutritional coverage for 4 astronauts across all macro and micronutrients, subject to 50 m² of space, 15 kW power, 1,000 L water." Show the nutrition heatmap — mostly green. This is the credibility moment.

**Slide 4 (40 sec) — Live Demo: Normal Operation**
Dashboard running. Sensor readings flowing. Crops growing. Nutrition tracker showing daily coverage. This must look polished.

**Slide 5 (40 sec) — Live Demo: Crisis Scenario**
THIS IS THE MONEY MOMENT.
1. Trigger dust storm → agent switches to triage mode → zones recolor by tier
2. Trigger crop failure (root rot) → agent detects, quarantines, deploys emergency microgreens
3. Nutrition coverage dips then recovers over 10 simulated days
4. Optional: radiation event → agent pulses UV-B on leafy greens → antioxidant boost

**Slide 6 (20 sec) — Mars-Only Features**
Quick hits: CO₂ from Mars atmosphere (free), 0.38g irrigation, spectrum control tied to radiation, morale scheduling. These show DEPTH.

**Slide 7 (15 sec) — Earth Applicability**
"Everything we built applies to autonomous controlled-environment agriculture on Earth — desert farming, post-disaster food production, Arctic greenhouses." Syngenta cares about this.

**Slide 8 (5 sec) — Team name, thank you.**

### 15.2 Key Pitch Rules
- REHEARSE TO EXACTLY 3 MINUTES. Cut anything that goes over.
- One person presents. Others answer Q&A.
- Demo must be live and interactive (click buttons to trigger events), not a video.
- If demo crashes, have backup screenshots ready.
- Mention specific numbers: "120 µg of vitamin K per 100g of kale" — specificity = credibility.

---

## 16. Judging Criteria

| Criterion | Weight | What Judges Look For | Our Strategy |
|---|---|---|---|
| **Creativity** | 25% | Novel ideas, unexpected connections, "I haven't seen that before" | Storm triage, microgreen emergency, morale module, photomorphogenic light control, CO₂ from Mars |
| **Functionality / Accuracy / Applicability** | 25% | Does it work? Is the science right? Could this actually be built? | Real USDA data, actual optimization model, working agent loop with traceable reasoning, grounded in Bedrock KB |
| **Visual Design / Ease of Use** | 25% | Polished dashboard, intuitive, glanceable, professional | Consistent color system, semantic color-coding, nutrition heatmap, crisis mode visual transition |
| **Pitch / Presentation Quality** | 25% | Clear narrative, engaging, fits in 3 min, live demo | Hook with human stakes, live crisis scenario, rehearsed to the second |

**Extra credit:** Using AWS tools provided (AgentCore, Bedrock, Amplify)

---

## 17. Candidate Crops

### 17.1 Recommended Starter Portfolio (8–12 crops for ~50 m²)

Based on space agriculture literature and nutritional optimization:

| Crop | Why | Growth Cycle | Key Nutrients |
|---|---|---|---|
| Lettuce (romaine) | Fast, reliable, cut-and-come-again | 30–45 days | Vitamin K, Folate, Fiber |
| Kale | Nutrient-dense powerhouse | 50–65 days | Vitamin K, C, A, Calcium, Iron |
| Spinach | High micronutrient density | 35–45 days | Iron, Folate, Vitamin K (note: oxalates reduce Ca absorption) |
| Cherry tomatoes (dwarf) | Continuous harvest, vitamin C, morale crop | 60–80 days to first, then continuous | Vitamin C, A, Potassium |
| Sweet bell peppers | Very high vitamin C | 70–90 days | Vitamin C (3× more than oranges), Vitamin A |
| Radishes | Fastest root crop | 25–30 days | Quick filler crop, some Vitamin C |
| Soybeans (edamame) | Complete protein, calorie-dense | 65–75 days | Protein (complete), Iron, Calcium, Folate |
| Dwarf wheat | Calorie base, grain | 60–90 days | Calories, Protein, B vitamins, Fiber |
| Sweet potatoes | High calorie density, vitamin A | 90–120 days | Calories, Vitamin A (huge), Fiber |
| Basil / herbs | Morale, flavor, fast | 20–30 days | Vitamin K, psychological benefit |
| Microgreens (broccoli, radish, pea) | Emergency nutrition, 7–14 day cycle | 7–14 days | 4–40× more nutrient-dense than mature |
| Spirulina (algae) | Protein, B vitamins, compact | Continuous harvest | Protein, Iron, B vitamins, GLA |

### 17.2 Crops to Mention but Not Model in Detail
- Potatoes (long cycle, but high calories)
- Strawberries (morale crop, vitamin C, but slow)
- Mushrooms (grow in the dark on waste substrate, vitamin D₂ with UV-B)

---

## 18. Open Questions & Unresolved Decisions

### 18.1 Architecture Decisions

| Decision | Options | Notes |
|---|---|---|
| Agent framework | Strands Agents / LangGraph / CrewAI / Raw function-calling | Need to check Strands docs first |
| Single agent vs multi-agent | One agent does everything / Specialized sub-agents (sensor, nutrition, resource, crisis) | Multi-agent is more creative but harder to debug in 24h |
| Simulation backend language | Python / Node.js / Both | Python for the science (scipy, pandas), Node for API layer? |
| Frontend framework | React / Next.js | React is simpler and faster for hackathon |
| Real-time updates | AppSync WebSocket / Polling / SSE | AppSync is ideal but adds setup time |
| Database for state | DynamoDB (via Amplify) / In-memory / SQLite | In-memory is simplest; DynamoDB if using Amplify Data |

### 18.2 Feature Decisions (Not Set in Stone)

See Section 10.3 above for the full list of undecided features:
- Morale module (implement as feature or just mention?)
- 0.38g irrigation (build or just pitch?)
- Thermal mass buffering (build or just pitch?)
- Predictive nutrient management (need ion uptake data)
- NASA API integration (worth the integration time?)
- How complex should the simulation model be? (Simple discrete steps vs differential equations)

### 18.3 Questions to Ask Syngenta Mentors

- How does the MCP server work exactly? What tools does it expose? What are the function signatures?
- How do we authenticate with AgentCore Gateway?
- Is the Bedrock Knowledge Base pre-provisioned for us, or do we set it up ourselves?
- Is 3D visualization (e.g., Three.js greenhouse model) in scope and valued, or is a 2D dashboard sufficient?
- What are the biggest real-world bottlenecks for controlled-environment agriculture that Syngenta cares about? (Helps tailor the "Earth applicability" angle)
- Are there specific crop varieties Syngenta has data for that we should prioritize?

### 18.4 Data Gaps We Need to Fill

| Data Needed | Source | Priority |
|---|---|---|
| Nutritional profiles per crop per 100g | USDA FoodData Central API or CSV | Critical |
| Hydroponic yield per crop (g/m²/day) | Compile from papers / estimates | Critical |
| Water use efficiency per crop (L/kg) | Academic papers | High |
| NASA astronaut nutritional requirements | NASA STD-3001, BVAD document | High |
| Mars InSight weather data | NASA API | Low |
| Crop growth curves (biomass vs time) | Academic papers | Medium |
| Ion uptake curves per crop | Academic papers (if doing predictive nutrient mgmt) | Low |

---

## 19. Time Budget

| Time Block | Hours | Activity | Who |
|---|---|---|---|
| Hours 0–2 | 2h | Architecture design, task assignment, data gathering (USDA, NASA), read MCP server docs, AgentCore auth | All |
| Hours 2–6 | 4h | PARALLEL: (A) Core agent loop + simulation engine + optimization model (B) Amplify setup + React scaffold + dashboard layout | A: Backend team, B: Frontend team |
| Hours 6–10 | 4h | PARALLEL: (A) Agent integration with Gateway + KB + tools (B) Dashboard components: sensor display, nutrition heatmap, resource gauges | A: Backend, B: Frontend |
| Hours 10–14 | 4h | Creative features: storm triage, microgreen emergency, LED spectrum control. Frontend: crisis mode UI, interactive controls | All |
| Hours 14–18 | 4h | Integration: agent ↔ dashboard, demo flow, crisis scenario scripting, bug fixing | All |
| Hours 18–20 | 2h | Polish: animations, transitions, edge cases, visual cleanup, responsive testing | Frontend |
| Hours 20–22 | 2h | Pitch: write slides, design pitch deck, rehearsal round 1 | 1–2 people |
| Hours 22–24 | 2h | Rehearsal rounds 2–3, final bug fixes, backup screenshots, deploy final version | All |

**Key rule:** Pitch preparation gets 4 full hours. Most teams give it 30 minutes. Pitch is 25% of the score — same weight as the entire technical build.

---

## Appendix: Key Constants for Simulation

```python
# Mission
CREW_SIZE = 4
MISSION_DURATION_SOLS = 450
GROWING_AREA_M2 = 50  # tunable

# Mars environment
MARS_GRAVITY = 3.72  # m/s²
MARS_SOLAR_IRRADIANCE_MAX = 590  # W/m²
MARS_SOL_LENGTH_HOURS = 24.62
MARS_ATMO_CO2_PERCENT = 95.3
MARS_SURFACE_TEMP_AVG = -60  # °C
MARS_COMMS_DELAY_MIN = 4  # minutes one-way (min)
MARS_COMMS_DELAY_MAX = 24  # minutes one-way (max)

# Greenhouse
GREENHOUSE_TEMP_TARGET = 22  # °C
GREENHOUSE_HUMIDITY_TARGET = 70  # %
GREENHOUSE_CO2_TARGET = 1200  # ppm
GREENHOUSE_PRESSURE = 101.3  # kPa
GREENHOUSE_PHOTOPERIOD_HOURS = 18
GREENHOUSE_PAR_TARGET = 400  # µmol/m²/s
GREENHOUSE_WATER_BUDGET_L = 1000  # initial
GREENHOUSE_WATER_RECYCLE_EFFICIENCY = 0.90
GREENHOUSE_POWER_BUDGET_KW = 20

# Nutrition (per astronaut per day, approximate NASA values)
DAILY_CALORIES_KCAL = 2800
DAILY_PROTEIN_G = 70
DAILY_FIBER_G = 25
DAILY_VITAMIN_C_MG = 90
DAILY_VITAMIN_K_UG = 120
DAILY_FOLATE_UG = 400
DAILY_CALCIUM_MG = 1200  # higher for spaceflight
DAILY_IRON_MG = 8
DAILY_POTASSIUM_MG = 3400
DAILY_VITAMIN_A_UG_RAE = 900

# Simulation
SIMULATION_TICK_HOURS = 6  # agent runs every 6 simulated hours
DUST_STORM_PROBABILITY_PER_SOL = 0.005  # ~2-3 per 450 days
DISEASE_PROBABILITY_PER_SOL = 0.002
```

---

*This document contains all context needed to build the Mars Greenhouse AI Agent for StartHack 2026 — Syngenta Challenge.*