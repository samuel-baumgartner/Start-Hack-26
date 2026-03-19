# Backend Bug Report

Runtime-verified issues with reproduction steps. No code changes—documentation only.

---

## High Impact

### 1. `adjust_lighting` `on=False` overwritten on tick

**Location:** `simulation/engine.py` (zone update loop, lines 84–95)

**Behavior:** During daytime, the engine unconditionally sets `zone.lighting_on = True` for all non-quarantined zones. User's explicit `adjust_lighting(on=False)` is ignored on the next tick.

**Reproduction:**
```bash
# 1. Start backend: cd backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000
# 2. Reset and set lighting off
curl -X POST http://localhost:8000/sim/reset
curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"adjust_lighting","zone_id":"A","params":{"on":false,"par":500}}'
# 3. Check state: lighting_on should be false
curl http://localhost:8000/sim/state | jq '.zones[] | select(.zone_id=="A") | {lighting_on, par_level}'
# 4. Tick once
curl -X POST http://localhost:8000/sim/tick -H "Content-Type: application/json" -d '{"n":1}'
# 5. Check again: lighting_on is now true (overwritten)
curl http://localhost:8000/sim/state | jq '.zones[] | select(.zone_id=="A") | {lighting_on}'
```

**Expected:** `lighting_on` stays `false` after tick.  
**Actual:** `lighting_on` becomes `true`.

---

### 2. `set_zone_priority` "high" does not preserve lighting off

**Location:** `simulation/engine.py` (zone update loop)

**Behavior:** The engine only checks `priority != "high"` for *nighttime* behavior (lights off at night). During *daytime*, all zones get `lighting_on = True` regardless of priority. So even `priority=high` does not preserve user's `on=False`.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset
curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"set_zone_priority","zone_id":"A","params":{"priority":"high"}}'
curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"adjust_lighting","zone_id":"A","params":{"on":false}}'
curl -X POST http://localhost:8000/sim/tick -H "Content-Type: application/json" -d '{"n":1}'
curl http://localhost:8000/sim/state | jq '.zones[] | select(.zone_id=="A") | {lighting_on}'
```

**Expected:** `lighting_on` stays `false` (high priority respects user override).  
**Actual:** `lighting_on` is `true`.

---

### 3. Quarantine freezes entire zone

**Location:** `simulation/engine.py` (zone loop, `if zone.is_quarantined: continue`)

**Behavior:** Quarantined zones skip all physics: no lighting updates, no temperature drift, no crop growth, no CO2/humidity updates. Zone is effectively paused.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset
# Get initial biomass for zone A
curl http://localhost:8000/sim/state | jq '.zones[] | select(.zone_id=="A") | .crops[] | {name, biomass_g}'
# Quarantine A
curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"quarantine_zone","zone_id":"A","params":{"quarantine":true}}'
# Tick 50 times
curl -X POST http://localhost:8000/sim/tick -H "Content-Type: application/json" -d '{"n":50}'
# Zone A biomass still 0; zone B (normal) has grown
curl http://localhost:8000/sim/state | jq '.zones[] | select(.zone_id=="A" or .zone_id=="B") | {zone_id, crops: [.crops[] | {name, biomass_g}]}'
```

**Expected:** Quarantine might reduce growth or isolate disease, but zone still simulates.  
**Actual:** Zone A biomass stays 0; zone B grows (e.g. spinach ~452g, basil ~315g).

---

### 4. `deploy_microgreens` unbounded

**Location:** `simulation/engine.py` (`apply_command` for `deploy_microgreens`)

**Behavior:** Each call appends a new microgreens crop to zone F. No limit on how many times it can be called.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset
for i in 1 2 3 4 5; do
  curl -s -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
    -d '{"action":"deploy_microgreens"}' > /dev/null
done
curl http://localhost:8000/sim/state | jq '.zones[] | select(.zone_id=="F") | [.crops[] | select(.name=="microgreens")] | length'
```

**Expected:** 1 (or some cap).  
**Actual:** 6 (1 default + 5 deploys).

---

### 5. Water counter reset order at sol boundary

**Location:** `simulation/engine.py` (lines 154–160)

**Behavior:** `update_water()` adds consumption to `water_consumed_today_l`, then `if tick_in_sol == 0` resets it to 0. On the first tick of a new sol, consumption is added and then immediately zeroed, so that tick's consumption is lost from the daily total.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset
# Tick to end of sol 1 (4 ticks per sol)
curl -X POST http://localhost:8000/sim/tick -H "Content-Type: application/json" -d '{"n":4}'
curl http://localhost:8000/sim/state | jq '{sol, water_consumed_today_l: .resources.water_consumed_today_l}'
# One more tick → sol 2, tick_in_sol 0
curl -X POST http://localhost:8000/sim/tick -H "Content-Type: application/json" -d '{"n":1}'
curl http://localhost:8000/sim/state | jq '{sol, water_consumed_today_l: .resources.water_consumed_today_l}'
```

**Expected:** First tick of sol 2 consumes water; `water_consumed_today_l` reflects that.  
**Actual:** `water_consumed_today_l` is 0.0 (first tick's consumption was added then reset).

---

## Validation / API Contract

### 6. HTTP 200 for app-level errors

**Location:** All command and event routes return `{"status":"error",...}` with HTTP 200.

**Behavior:** Validation and business-logic failures return 200 instead of 4xx. Clients must parse the body to detect errors.

**Reproduction:**
```bash
# Missing zone_id
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/sim/command \
  -H "Content-Type: application/json" -d '{"action":"harvest_crop","params":{"crop_name":"lettuce"}}'
# Returns 200

# Invalid zone
curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:8000/sim/command \
  -H "Content-Type: application/json" -d '{"action":"harvest_crop","zone_id":"Z","params":{"crop_name":"lettuce"}}'
# Returns 200

# Empty crop name
curl -s -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"plant_crop","zone_id":"A","params":{"crop_name":""}}'
# Returns 200 with {"status":"error","message":"Unknown crop: "}
```

**Expected:** 400 or 422 for invalid/missing parameters.  
**Actual:** 200 with error payload.

---

### 7. Missing `zone_id` → generic "Unknown action" or "Zone 'None' not found"

**Location:** `simulation/engine.py` `apply_command`

**Behavior:** Zone-required commands without `zone_id` yield "Zone 'None' not found" instead of a clear parameter validation error.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"harvest_crop","params":{"crop_name":"lettuce"}}'
```

**Expected:** "Missing required parameter: zone_id" or similar.  
**Actual:** `{"status":"error","message":"Zone 'None' not found"}`.

---

### 8. Optimizer accepts negative constraints

**Location:** `simulation/nutrition.py` `optimize_crop_allocation`, `api/simulation_routes.py`

**Behavior:** Negative `area_m2`, `water_budget_l_per_day`, `power_budget_kw` are accepted. scipy returns infeasible; API returns 200 with error message.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/optimize -H "Content-Type: application/json" \
  -d '{"area_m2":-10}'
# Returns 200 {"status":"error","message":"Optimization failed: ... Infeasible ..."}
```

**Expected:** 422 or validation error for negative values.  
**Actual:** 200 with solver error.

---

### 9. Sensor-failure negative duration accepted and clamped

**Location:** `simulation/events.py` or sensor failure handler

**Behavior:** Negative `duration_ticks` is clamped to 1 and the sensor is actually failed. Caller may expect rejection.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset
curl -X POST http://localhost:8000/events/sensor-failure -H "Content-Type: application/json" \
  -d '{"zone_id":"A","sensor_name":"temperature","duration_ticks":-5}'
# Returns 200 {"status":"ok","message":"... duration: 1 ticks"}
curl http://localhost:8000/sim/sensors/A | jq '.temperature'
# Returns null (sensor failed)
```

**Expected:** 400/422 for negative duration.  
**Actual:** 200, duration clamped to 1, sensor fails.

---

### 10. Dust storm negative params accepted and clamped

**Location:** `simulation/events.py` `_trigger_dust_storm`

**Behavior:** `opacity_tau=-1`, `duration_sols=-3` are clamped (tau→0, duration→1). No validation error.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset
curl -X POST http://localhost:8000/events/dust-storm -H "Content-Type: application/json" \
  -d '{"opacity_tau":-1,"duration_sols":-3}'
curl http://localhost:8000/sim/state | jq '.environment | {dust_opacity_tau, dust_storm_remaining_sols}'
```

**Expected:** Reject negative params.  
**Actual:** Clamped; storm starts with tau=0, duration=1.

---

## State / Schema

### 11. Reset vs GET /sim/state zone schema mismatch

**Location:** `api/simulation_routes.py` — reset returns `result.model_dump()`, get_state uses `get_all_ground_truth()`

**Behavior:** `POST /sim/reset` returns zones with `area_m2`, `irrigation_rate_l_per_hour`, `par_setpoint`, `photoperiod_hours`, `temperature_setpoint`. `GET /sim/state` returns zones with `environment`, `irrigation_rate`, `resources` instead. Different field names and structure.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset | jq '.state.zones[0] | keys'
curl http://localhost:8000/sim/state | jq '.zones[0] | keys'
# Compare: reset has area_m2, par_setpoint, etc.; state has environment, resources, irrigation_rate
```

---

### 12. Reset includes `agent_decisions`, GET /sim/state does not

**Behavior:** Reset response has `state.agent_decisions`; GET /sim/state has `agent_decisions_count` but not the list.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset | jq 'has("state") and (.state | has("agent_decisions"))'
curl http://localhost:8000/sim/state | jq 'has("agent_decisions")'
# First true, second false
```

---

## Events

### 13. Crop-failure non-existent crop returns 200 with error

**Behavior:** `POST /events/crop-failure` with non-existent crop returns 200 and `{"status":"error","message":"Crop X not found..."}`. Correct validation, but HTTP status is 200.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset
curl -X POST http://localhost:8000/events/crop-failure -H "Content-Type: application/json" \
  -d '{"zone_id":"A","crop_name":"nonexistent_crop"}'
# Returns 200
```

---

### 14. Sensor-failure invalid zone/sensor returns 200 with error

**Behavior:** Invalid zone or sensor name returns 200 with error message. State is not polluted (invalid zone not added to `_sensor_failures`).

**Reproduction:**
```bash
curl -X POST http://localhost:8000/events/sensor-failure -H "Content-Type: application/json" \
  -d '{"zone_id":"Z","sensor_name":"temperature","duration_ticks":10}'
# Returns 200 {"status":"error","message":"Zone Z not found"}
```

---

## Clarifications (Not Bugs)

- **Disease clearing:** Disease state (`disease_active`, `disease_zone_id`) clears when `duration_sols` expires or when zone is quarantined / all crops dead. Verified: after 100 ticks with 2-sol duration, state clears.
- **Power failure:** `reduction` is clamped to [0,1] before storage; API response shows clamped value.
- **Tick n=0:** Returns 422 (validation works).
- **Reset clears sensor failures:** Verified; `_sensor_failures` is empty after reset.

---

## Summary Table

| # | Severity | Area        | Brief description                          |
|---|----------|-------------|--------------------------------------------|
| 1 | High     | Engine      | Lighting `on=False` overwritten on tick    |
| 2 | High     | Engine      | Priority "high" does not preserve lighting   |
| 3 | High     | Engine      | Quarantine freezes zone entirely           |
| 4 | High     | Engine      | deploy_microgreens unbounded               |
| 5 | Medium   | Engine      | Water counter reset order at sol boundary   |
| 6 | Medium   | API         | HTTP 200 for app-level errors               |
| 7 | Low      | API         | Missing zone_id → unclear error            |
| 8 | Medium   | Optimizer   | Negative constraints accepted              |
| 9 | Low      | Events      | Sensor-failure negative duration clamped   |
|10 | Low      | Events      | Dust storm negative params clamped         |
|11 | Low      | API         | Reset vs state zone schema mismatch         |
|12 | Low      | API         | agent_decisions in reset, not in state     |
|13 | Low      | Events      | Crop-failure 200 for not-found              |
|14 | Low      | Events      | Sensor-failure 200 for invalid zone/sensor  |

---

## Additional Issues (New)

### 15. Reset does not stop auto-tick

**Location:** `main.py` — reset endpoint does not call `auto-tick/stop`

**Behavior:** After `POST /sim/reset`, the auto-tick loop keeps running. State is reset to total_ticks=0, but within seconds auto-tick advances it again. Client may assume reset = clean slate, but simulation continues advancing in background.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/auto-tick/start -G --data-urlencode "interval=1.0"
curl -X POST http://localhost:8000/sim/reset
curl http://localhost:8000/sim/state | jq '.total_ticks'   # 0
sleep 2
curl http://localhost:8000/sim/state | jq '.total_ticks'   # 2 or more
curl http://localhost:8000/auto-tick/status                 # enabled: true
```

**Expected:** Reset stops auto-tick, or docs clarify that it does not.  
**Actual:** Auto-tick keeps running; state advances despite "reset".

---

### 16. Dust storm accepts invalid severity

**Location:** `simulation/events.py` `_trigger_dust_storm`

**Behavior:** `severity` is passed through without validation. Values like `"invalid"` or `"foo"` are accepted and used in the event description. Only `"global"` and `"regional"` have defined behavior; other values fall through to the `else` branch (regional logic) but the string appears in logs.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset
curl -X POST http://localhost:8000/events/dust-storm -H "Content-Type: application/json" \
  -d '{"severity":"invalid"}'
```

**Expected:** Reject invalid severity or validate against `["regional","global"]`.  
**Actual:** 200 OK, message contains "Dust storm (invalid) started".

---

### 17. Empty action string accepted

**Location:** `api/simulation_routes.py` `CommandRequest` — `action: str` has no min length

**Behavior:** `{"action":"","zone_id":"A"}` returns 200 with "Unknown action: " instead of 422 for invalid/missing action.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"","zone_id":"A"}'
```

**Expected:** 422 (action required) or validation error.  
**Actual:** 200 `{"status":"error","message":"Unknown action: "}`.

---

### 18. harvest_crop with wrong param key yields confusing error

**Location:** `simulation/engine.py` `apply_command` for harvest_crop

**Behavior:** `params={"crop":"lettuce"}` instead of `params={"crop_name":"lettuce"}` causes `crop_name = params.get("crop_name")` to be None. Error message: "Crop None not found in zone A".

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset
curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"harvest_crop","zone_id":"A","params":{"crop":"lettuce"}}'
```

**Expected:** "Missing parameter: crop_name" or similar.  
**Actual:** "Crop None not found in zone A".

---

### 19. Tick with empty body uses default n=1

**Location:** `api/simulation_routes.py` `TickRequest` — `n: int = Field(default=1, ...)`

**Behavior:** `POST /sim/tick` with body `{}` or no body succeeds and advances by 1 tick. May be intentional, but differs from explicit `{"n":1}`. If client sends `{}` by mistake, simulation advances.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/tick -H "Content-Type: application/json" -d '{}'
# Returns 200, total_ticks increases by 1
```

**Note:** Could be by design. Document if intentional.

---

### 20. Optimize returns min_coverage_percent -0.0 for zero constraints

**Location:** `simulation/nutrition.py` / optimize response

**Behavior:** When all constraints are 0 (`area_m2=0`, etc.), response includes `min_coverage_percent: -0.0` (negative zero). Cosmetic but inconsistent.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/optimize -H "Content-Type: application/json" \
  -d '{"area_m2":0,"water_budget_l_per_day":0,"power_budget_kw":0}'
```

**Expected:** `0.0` or `null`.  
**Actual:** `-0.0`.

---

### 21. SENSOR_FAILURE_PROBABILITY unused

**Location:** `simulation/sensors.py` — imported from config but never used

**Behavior:** `SENSOR_FAILURE_PROBABILITY = 0.02` exists in config; sensors.py imports it but does not apply random failures on read. Sensor nulls only occur from explicit `fail_sensor()` (events). Either dead code or missing feature.

**Reproduction:** Code inspection — no `random.random() < SENSOR_FAILURE_PROBABILITY` in sensor read path.

---

### 22. GET /sim/sensors vs GET /sim/sensors/{zone_id} structure differs

**Location:** `api/simulation_routes.py`

**Behavior:** `GET /sim/sensors` returns a list of dicts (one per zone). `GET /sim/sensors/{zone_id}` returns a single dict (no list wrapper). Clients must handle both shapes. Invalid zone_id returns 404 (correct).

**Reproduction:**
```bash
curl http://localhost:8000/sim/sensors | jq 'type'           # "array"
curl http://localhost:8000/sim/sensors/A | jq 'type'         # "object"
```

**Note:** May be intentional (list for all, object for one). Document for API consumers.

---

### 23. quarantine_zone accepts non-boolean and corrupts type

**Location:** `simulation/engine.py` — `zone.is_quarantined = params.get("quarantine", True)`

**Behavior:** Passing `params={"quarantine":"yes"}` assigns the string `"yes"` to `zone.is_quarantined`, which is typed as `bool`. State and API then return `is_quarantined: "yes"` instead of `true`. Zone is still skipped (truthy), but the model is corrupted and clients may break.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset
curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"quarantine_zone","zone_id":"A","params":{"quarantine":"yes"}}'
curl http://localhost:8000/sim/state | jq '.zones[] | select(.zone_id=="A") | .is_quarantined'
```

**Expected:** Coerce to bool or reject non-boolean.  
**Actual:** `"yes"` (string) stored and returned.

---

## Deep Scrutiny (New)

### 24. Irrigation rate unbounded — drains reservoir in one tick

**Location:** `simulation/engine.py` `adjust_irrigation`, `simulation/resources.py` `compute_water_consumption`

**Behavior:** No upper bound on irrigation rate. `rate=1e10` is accepted. `irrigation_factor = rate / 0.5` becomes 2e10; water consumption scales linearly, draining the full 1000L reservoir in a single tick.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset
curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"adjust_irrigation","zone_id":"A","params":{"rate":10000000000}}'
curl http://localhost:8000/sim/state | jq '.resources.water_reservoir_l'   # 1000
curl -X POST http://localhost:8000/sim/tick -H "Content-Type: application/json" -d '{"n":1}'
curl http://localhost:8000/sim/state | jq '.resources.water_reservoir_l'   # 0
```

**Expected:** Cap irrigation rate (e.g. 0–5 L/hr) or reject extreme values.  
**Actual:** Full reservoir drained in one tick.

---

### 25. adjust_lighting `on` accepts string and corrupts type

**Location:** `simulation/engine.py` — `zone.lighting_on = params.get("on", zone.lighting_on)`

**Behavior:** `params={"on":"false"}` assigns the string `"false"` to `zone.lighting_on`. State returns `lighting_on: "false"` (string). In Python, `if zone.lighting_on` is True for any non-empty string, so the zone is treated as lights-on for power consumption and PAR. User intent (off) is inverted.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset
curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"adjust_lighting","zone_id":"A","params":{"on":"false"}}'
curl http://localhost:8000/sim/state | jq '.zones[] | select(.zone_id=="A") | {lighting_on, lighting_on_type: (.lighting_on | type)}'
# lighting_on: "false" (string), zone still draws power
```

**Expected:** Coerce to bool (`"true"`→true, `"false"`→false) or reject non-boolean.  
**Actual:** String stored; zone treated as lights-on (truthy).

---

### 26. zone_id null yields 200 with "Zone 'None' not found"

**Location:** `api/simulation_routes.py` — `zone_id: Optional[str] = None` allows null; engine formats it in error

**Behavior:** `{"action":"harvest_crop","zone_id":null,"params":{"crop_name":"lettuce"}}` reaches the engine. `_get_zone(None)` returns None; error message is "Zone 'None' not found". Should be rejected at validation (422) with a clear parameter error.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"harvest_crop","zone_id":null,"params":{"crop_name":"lettuce"}}'
```

**Expected:** 422 "zone_id is required" or similar.  
**Actual:** 200 `{"status":"error","message":"Zone 'None' not found"}`.

---

### 27. Optimize returns allocation but does not apply to state

**Location:** `api/simulation_routes.py` — optimize calls `optimize_crop_allocation()` and returns result; no state mutation

**Behavior:** `POST /sim/optimize` returns an allocation (e.g. lettuce 0.98 m², soybean 9.02 m²) but does not change zone crops or areas. State remains with default crops. Users may expect "optimize" to apply the recommendation.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset
curl -X POST http://localhost:8000/sim/optimize -H "Content-Type: application/json" -d '{"area_m2":10}'
curl http://localhost:8000/sim/state | jq '.zones[] | {zone_id, crops: [.crops[].name]}'
# Crops unchanged from default; allocation was advisory only
```

**Note:** May be intentional (optimizer as advisory). Document clearly for API consumers.

---

### 28. Disease in new zone overwrites previous disease

**Location:** `simulation/events.py` `_trigger_disease`

**Behavior:** Triggering disease in zone D while disease is active in zone C overwrites `disease_zone_id` to D. Only one zone can have active disease at a time. No error or warning when replacing.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset
curl -X POST http://localhost:8000/events/disease -H "Content-Type: application/json" -d '{"zone_id":"C"}'
curl -X POST http://localhost:8000/events/disease -H "Content-Type: application/json" -d '{"zone_id":"D"}'
curl http://localhost:8000/sim/state | jq '.environment.disease_zone_id'   # "D"
```

**Note:** May be intentional (single disease). Document if so.

---

### 29. Crop names case-sensitive

**Location:** `simulation/crops.py` `CROP_DATABASE`, `simulation/engine.py` `plant_crop` / `harvest_crop`

**Behavior:** Crop names must match exactly. `"Lettuce"` and `"LETTUCE"` return "Unknown crop" or "Crop not found". Only `"lettuce"` works. Natural language or UI input may use different casing.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset
curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"plant_crop","zone_id":"A","params":{"crop_name":"Lettuce"}}'
# Returns "Unknown crop: Lettuce"
```

**Note:** May be intentional. Consider case-insensitive lookup for robustness.

---

## New Issues Summary Table

| # | Severity | Area        | Brief description                          |
|---|----------|-------------|--------------------------------------------|
|15 | High     | Lifecycle   | Reset does not stop auto-tick               |
|16 | Low      | Events      | Dust storm invalid severity accepted       |
|17 | Low      | API         | Empty action string accepted               |
|18 | Low      | API         | harvest wrong param key → "Crop None"      |
|19 | Info     | API         | Tick empty body defaults to n=1            |
|20 | Low      | Optimizer   | min_coverage_percent -0.0 for zero         |
|21 | Info     | Sensors     | SENSOR_FAILURE_PROBABILITY unused           |
|22 | Info     | API         | Sensors list vs object structure           |
|23 | Medium   | Engine      | quarantine_zone accepts non-boolean         |
|24 | High     | Engine      | Irrigation rate unbounded                   |
|25 | High     | Engine      | adjust_lighting on string corrupts type     |
|26 | Low      | API         | zone_id null → 200 "Zone None"              |
|27 | Info     | API         | Optimize does not apply to state            |
|28 | Info     | Events      | Disease overwrites previous zone            |
|29 | Low      | Engine      | Crop names case-sensitive                   |

---

# NEW BUGS FOUND

*The following issues were discovered in the latest debugging session. They are documented here in a dedicated section for visibility.*

---

## 30. Command params as strings cause 500 TypeError

**Location:** `simulation/engine.py` `apply_command` — numeric params compared without type check

**Behavior:** `params` is `dict` with no schema; values can be strings. When the engine compares them to numeric bounds, `TypeError: '<=' not supported between instances of 'int' and 'str'` is raised. Server returns 500. Affected params: `par`, `photoperiod` (adjust_lighting); `target` (adjust_temperature); `rate` (adjust_irrigation); `ph`, `ec` (adjust_nutrient_solution).

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"adjust_lighting","zone_id":"A","params":{"par":"500"}}'
# Returns 500 Internal Server Error (TypeError)

curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"adjust_nutrient_solution","params":{"ph":"6.5"}}'
# Returns 500 (TypeError)
```

**Expected:** 422 or app-level error "par must be a number".  
**Actual:** 500 TypeError.

---

## 31. Harvested crops regrow on tick

**Location:** `simulation/engine.py` growth loop (lines 133–154)

**Behavior:** The growth loop only skips crops with `health <= 0`. Harvested crops have `health=100` and `growth_stage=HARVESTED`. They are not skipped; they receive growth increment, `days_planted` increases, and `growth_stage` is overwritten (e.g. SEEDLING → VEGETATIVE → FLOWERING). A harvested crop can regrow to flowering with biomass.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset
curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"harvest_crop","zone_id":"F","params":{"crop_name":"microgreens"}}'
curl http://localhost:8000/sim/state | jq '.zones[] | select(.zone_id=="F") | .crops[] | select(.name=="microgreens") | {growth_stage, biomass_g}'
# growth_stage: "harvested", biomass_g: 0
curl -X POST http://localhost:8000/sim/tick -H "Content-Type: application/json" -d '{"n":20}'
curl http://localhost:8000/sim/state | jq '.zones[] | select(.zone_id=="F") | .crops[] | select(.name=="microgreens") | {growth_stage, biomass_g}'
# growth_stage: "flowering", biomass_g: ~101 — regrew!
```

**Expected:** Harvested crops are skipped in the growth loop.  
**Actual:** Harvested crops regrow.

---

## 32. Power consumption with battery at 0

**Location:** `simulation/resources.py` `update_power`, `compute_power_consumption`

**Behavior:** When battery is 0 and power failure is 100%, `power_generation_kw` is 0 but `power_consumption_kw` remains non-zero (e.g. 8.5 kW). Consumption is not reduced when there is no power. Battery can stay at 0 while systems still "consume" power.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset
curl -X POST http://localhost:8000/events/power-failure -H "Content-Type: application/json" -d '{"reduction":1.0}'
curl -X POST http://localhost:8000/sim/tick -H "Content-Type: application/json" -d '{"n":50}'
curl http://localhost:8000/sim/state | jq '{battery_percent: .resources.battery_percent, power_gen: .resources.power_generation_kw, power_consumption: .resources.power_consumption_kw}'
# battery_percent: 0, power_gen: 0, power_consumption: 8.5
```

**Note:** May be intentional (consumption tracks demand regardless of supply). Document if so.

---

## 33. OPTIONS returns 405 — CORS preflight may fail

**Location:** FastAPI routing — no explicit OPTIONS handler for POST endpoints

**Behavior:** Browsers send `OPTIONS` before cross-origin `POST` requests (CORS preflight). `OPTIONS /sim/tick`, `OPTIONS /sim/command`, `OPTIONS /sim/reset` return 405 Method Not Allowed. The CORS middleware adds `Access-Control-Allow-Origin: *` to successful responses, but if the preflight fails, the browser may block the actual request.

**Reproduction:**
```bash
curl -X OPTIONS http://localhost:8000/sim/command -v
# Returns 405 Method Not Allowed
```

**Expected:** OPTIONS returns 200 with appropriate CORS headers, or CORS middleware handles preflight.  
**Actual:** 405.

---

## 34. deploy_microgreens targets quarantined zone F

**Location:** `simulation/engine.py` — `target_zone = self._get_zone("F") or self.state.zones[-1]`

**Behavior:** When zone F is quarantined, `deploy_microgreens` still adds microgreens to F. Emergency food is deployed to an isolated zone that cannot be accessed. No check for `is_quarantined` when selecting target zone.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset
curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"quarantine_zone","zone_id":"F","params":{"quarantine":true}}'
curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"deploy_microgreens"}'
curl http://localhost:8000/sim/state | jq '.zones[] | select(.zone_id=="F") | {is_quarantined, microgreens: [.crops[] | select(.name=="microgreens")] | length}'
# is_quarantined: true, microgreens: 2 (default + 1 deploy)
```

**Expected:** Deploy to first non-quarantined zone, or reject if all zones quarantined.  
**Actual:** Deploys to F even when quarantined.

---

## 35. zone_id case-sensitive — lowercase fails

**Location:** Zone lookup throughout — `zone_id` compared with exact match

**Behavior:** Zone IDs are uppercase (A–F). `zone_id="a"` returns 404 for `GET /sim/sensors/a` and 400 "Zone 'a' not found" for commands. Users or clients sending lowercase may get unexpected failures.

**Reproduction:**
```bash
curl http://localhost:8000/sim/sensors/a
# Returns 404 "Zone a not found"

curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"harvest_crop","zone_id":"a","params":{"crop_name":"lettuce"}}'
# Returns 400 "Zone 'a' not found"
```

**Expected:** Normalize to uppercase or accept case-insensitive zone_id.  
**Actual:** Only "A"–"F" (uppercase) accepted.

---

## 36. Disease zone_id empty string returns 400 with odd message

**Location:** `api/event_routes.py` `_check_event_result`, `simulation/events.py` `_trigger_disease`

**Behavior:** `zone_id=""` passes Pydantic (empty string is valid). Engine returns `{"status":"error","message":"Zone  not found"}`. `_check_event_result` raises HTTP 400. Message has double space: "Zone  not found".

**Reproduction:**
```bash
curl -X POST http://localhost:8000/events/disease -H "Content-Type: application/json" -d '{"zone_id":""}'
# Returns 400 {"detail": "Zone  not found"}
```

**Note:** Minor — consider validating non-empty zone_id at API layer with 422.

---

## 37. Reset vs state environment schema — different keys

**Location:** `api/simulation_routes.py` — reset returns `model_dump()`, get_state builds custom dict

**Behavior:** `POST /sim/reset` returns `state.environment` with `solar_irradiance_w_m2`, `tick`, `is_daytime`, `sol`, `total_ticks`, `power_failure_reduction`. `GET /sim/state` returns `environment` with `solar_irradiance` (different key) and omits tick/sol/total_ticks from environment (they are at top level). Clients parsing both must handle different shapes.

**Reproduction:**
```bash
curl -X POST http://localhost:8000/sim/reset | jq '.state.environment | keys'
curl http://localhost:8000/sim/state | jq '.environment | keys'
# Compare: reset has solar_irradiance_w_m2, state has solar_irradiance
# reset env has tick, sol, total_ticks; state has them at root
```

**Expected:** Consistent schema between reset response and get_state.  
**Actual:** Different keys and structure.

---

## SSE / Real-time (New)

### 38. Client disconnect during broadcast → RuntimeError

**Location:** `main.py` lines 99–103 (auto_tick_loop broadcast), 219–224 (event_generator finally)

**Behavior:** `auto_tick_loop` iterates `for q in sse_queues` and calls `q.put_nowait()`. When a client disconnects, the `event_generator`'s `finally` block runs `sse_queues.remove(queue)`, mutating the list during iteration. Python raises `RuntimeError: list modified during iteration`.

**Reproduction:**
```bash
# 1. Start backend with auto-tick
cd backend && uvicorn main:app --port 8000
curl -X POST "http://localhost:8000/auto-tick/start?interval=0.5"

# 2. Connect SSE client, then disconnect quickly (e.g. close browser tab or kill curl)
curl -N http://localhost:8000/sim/stream &
sleep 1
kill %1

# 3. Repeat rapidly; eventually auto_tick_loop hits the disconnect during broadcast
# Server may log: RuntimeError: list modified during iteration
```

**Expected:** Iterate over a copy of the list, or use a thread-safe structure.  
**Actual:** RuntimeError crashes the broadcast loop.

---

### 40. No initial event on SSE connect

**Location:** `main.py` lines 219–224 (`event_generator`)

**Behavior:** New SSE clients connect and immediately block on `await queue.get()`. They receive no data until the next auto-tick (or manual tick) broadcasts. If auto-tick is off and no tick occurs, the client waits indefinitely with no initial state.

**Reproduction:**
```bash
# 1. Start backend, do NOT start auto-tick
# 2. Connect to SSE
curl -N http://localhost:8000/sim/stream
# Hangs until first tick; no initial state sent
```

**Expected:** Send current state snapshot immediately on connect.  
**Actual:** Client waits for first broadcast.

---

## Concurrency / Memory (New)

### 39. No locking on shared engine; data races possible

**Location:** `main.py` (global `engine`), `simulation/engine.py`, all routes and agent tools

**Behavior:** Single `SimulationEngine` instance shared by simulation routes, event routes, agent routes, and auto-tick loop. No locks or async coordination. Concurrent `engine.tick()`, `apply_command()`, `reset()`, and state reads can interleave. Agent runs in `asyncio.to_thread()`; tools call `apply_command()` from that thread while other requests may be modifying the engine.

**Reproduction:**
```bash
# Run concurrently: tick, command, agent_tick
curl -X POST http://localhost:8000/sim/tick -d '{"n":5}' &
curl -X POST http://localhost:8000/sim/command -H "Content-Type: application/json" \
  -d '{"action":"adjust_irrigation","zone_id":"A","params":{"rate":1}}' &
curl -X POST http://localhost:8000/agent/tick &
wait
# No guaranteed ordering; state may be inconsistent during reads
```

**Expected:** Serialize engine access (e.g. lock, queue) or document single-writer assumption.  
**Actual:** Unprotected concurrent access.

---

### 41. agent_decisions and _decision_log grow unbounded

**Location:** `simulation/state.py` (agent_decisions), `api/agent_routes.py` (_decision_log)

**Behavior:** Each agent tick/query appends to `_decision_log` and `engine.state.agent_decisions`. No truncation or cap. Long-running sessions accumulate unbounded memory.

**Reproduction:**
```bash
# Call agent tick 10000 times
for i in $(seq 10000); do curl -s -X POST http://localhost:8000/agent/tick > /dev/null; done
# Memory usage grows with each call
```

**Expected:** Cap log size (e.g. keep last N entries) or paginate.  
**Actual:** Unbounded growth.

---

## MCP / Agent (New)

### 42. No per-call timeout for MCP tool invocations

**Location:** `agent/greenhouse_agent.py` lines 174–178 (`_create_mcp_client`)

**Behavior:** MCP client has `startup_timeout=30` for initial connection. Individual tool calls (Syngenta KB queries) have no explicit timeout. Slow or hung KB responses block the agent until completion or connection failure.

**Reproduction:**
```bash
# If MCP/KB is slow or unresponsive, agent query hangs
curl -X POST http://localhost:8000/agent/query -H "Content-Type: application/json" \
  -d '{"message":"What crops grow best in low light?"}'
# May hang indefinitely
```

**Expected:** Per-call timeout or configurable limit.  
**Actual:** No timeout; agent can block indefinitely.

---

## Nutrition / Auto-tick (New)

### 43. Caloric coverage never computed

**Location:** `simulation/nutrition.py` (DAILY_REQUIREMENTS, compute_nutrition_coverage)

**Behavior:** `DAILY_REQUIREMENTS` includes protein, iron, vitamin C, etc. Crop data has `calories_kcal` per 100g, but calories are not in requirements. Caloric coverage is never computed or returned.

**Reproduction:**
```bash
curl http://localhost:8000/sim/nutrition | jq '.requirements, .coverage'
# coverage has protein, iron, vitamin_c, etc. — no calories
```

**Expected:** Include calories in requirements and coverage if relevant for mission.  
**Actual:** Calories ignored.

---

### 44. One extra tick possible after auto-tick stop requested

**Location:** `main.py` lines 76–106 (auto_tick_loop)

**Behavior:** `stop_auto_tick()` sets `auto_tick_enabled = False` and cancels the task. Cancellation is delivered at `await asyncio.sleep()`. If the task is currently in `engine.tick(1)` or the broadcast loop, it finishes that iteration before being cancelled. One extra tick can occur after reset/stop.

**Reproduction:**
```bash
# 1. Start auto-tick; note tick count
curl -X POST "http://localhost:8000/auto-tick/start?interval=1"
sleep 2
curl http://localhost:8000/sim/state | jq '.tick'

# 2. Reset (which stops auto-tick)
curl -X POST http://localhost:8000/sim/reset
curl http://localhost:8000/sim/state | jq '.tick'
# Expected: 0. May see 1 if extra tick ran after stop
```

**Expected:** Stop before next tick; or document acceptable one-tick lag.  
**Actual:** One extra tick possible.

---

## New Bugs Summary Table

| #  | Severity | Area   | Brief description                              |
|----|----------|--------|-----------------------------------------------|
| 30 | High     | Engine | String params → 500 TypeError                 |
| 31 | High     | Engine | Harvested crops regrow on tick                |
| 32 | Info     | Engine | Power consumption when battery 0              |
| 33 | Medium   | API    | OPTIONS 405 — CORS preflight may fail         |
| 34 | Low      | Engine | deploy_microgreens targets quarantined zone   |
| 35 | Low      | API    | zone_id case-sensitive                        |
| 36 | Low      | Events | Disease zone_id empty → odd message           |
| 37 | Low      | API    | Reset vs state environment schema mismatch    |
| 38 | High     | SSE    | Client disconnect during broadcast → RuntimeError |
| 39 | High     | Concurrency | No locking on shared engine; data races possible |
| 40 | Medium   | SSE    | No initial event on connect; clients wait for first tick |
| 41 | Medium   | Memory | agent_decisions / _decision_log grow unbounded |
| 42 | Medium   | MCP    | No per-call timeout for MCP tool invocations |
| 43 | Low      | Nutrition | Caloric coverage never computed |
| 44 | Low      | Auto-tick | One extra tick possible after stop requested |
