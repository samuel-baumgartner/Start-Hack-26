"""Tests for Round 2 bug fixes (R1-R9)."""

import sys
sys.path.insert(0, ".")

from simulation.engine import SimulationEngine
from simulation.sensors import (
    get_ground_truth,
    get_sensor_readings,
    reset_sensor_state,
)
from simulation.state import create_default_state

# ─── Helpers ───────────────────────────────────────────

def fresh_engine() -> SimulationEngine:
    e = SimulationEngine()
    reset_sensor_state()
    return e


def tick_to_sol_boundary(engine: SimulationEngine) -> int:
    """Tick until we're at tick_in_sol == 0 (start of new sol). Return ticks advanced."""
    count = 0
    # First advance past current tick 0 if we're on one
    engine.tick(1)
    count += 1
    while engine.state.environment.tick != 0:
        engine.tick(1)
        count += 1
    return count


passed = 0
failed = 0
errors = []


def check(name: str, condition: bool, detail: str = ""):
    global passed, failed
    if condition:
        passed += 1
        print(f"  ✓ {name}")
    else:
        failed += 1
        msg = f"  ✗ {name}" + (f" — {detail}" if detail else "")
        print(msg)
        errors.append(msg)


# ═══════════════════════════════════════════════════════
# R1: Quarantine freezes ALL zone physics → should only skip growth
# ═══════════════════════════════════════════════════════
print("\n═══ R1: Quarantine should not freeze physics ═══")

e = fresh_engine()
zone_a = e.state.zones[0]

# Record initial physics
temp_before = zone_a.temperature
co2_before = zone_a.co2_ppm
humidity_before = zone_a.humidity

# Quarantine and tick
e.apply_command({"action": "quarantine_zone", "zone_id": "A", "params": {"quarantine": True}})
check("Zone A is quarantined", zone_a.is_quarantined)

e.tick(10)

check(
    "Temperature changed while quarantined",
    zone_a.temperature != temp_before,
    f"before={temp_before}, after={zone_a.temperature}",
)
check(
    "CO2 changed while quarantined",
    zone_a.co2_ppm != co2_before,
    f"before={co2_before}, after={zone_a.co2_ppm}",
)
check(
    "Humidity changed while quarantined",
    zone_a.humidity != humidity_before,
    f"before={humidity_before}, after={zone_a.humidity}",
)

# Crops should NOT have grown
crops_before_days = []
e2 = fresh_engine()
zone_a2 = e2.state.zones[0]
for c in zone_a2.crops:
    crops_before_days.append(c.days_planted)

e2.apply_command({"action": "quarantine_zone", "zone_id": "A", "params": {"quarantine": True}})
e2.tick(10)

for i, c in enumerate(zone_a2.crops):
    check(
        f"Crop '{c.crop_name}' did NOT grow while quarantined",
        c.days_planted == crops_before_days[i],
        f"days_planted before={crops_before_days[i]}, after={c.days_planted}",
    )


# ═══════════════════════════════════════════════════════
# R2: Water counter drops boundary-tick consumption
# ═══════════════════════════════════════════════════════
print("\n═══ R2: Water counter boundary-tick ═══")

e = fresh_engine()

# Tick to just before a sol boundary
ticks = tick_to_sol_boundary(e)
# We're now at tick_in_sol == 0 (start of new sol)
# The daily counter should have been reset BEFORE water consumption
# So water_consumed_today_l should be > 0 (includes this tick's consumption)
water_consumed = e.state.resources.water_consumed_today_l
check(
    "Water consumed on boundary tick is tracked (not wiped)",
    water_consumed > 0,  # Must be >0: reset happens BEFORE consumption, so this tick's water is counted
    f"water_consumed_today_l={water_consumed}",
)

# More specific: tick one more time and check counter increases
water_before = e.state.resources.water_consumed_today_l
e.tick(1)
water_after = e.state.resources.water_consumed_today_l
check(
    "Water consumption accumulates within sol",
    water_after >= water_before,
    f"before={water_before}, after={water_after}",
)


# ═══════════════════════════════════════════════════════
# R3: Priority modes low/hibernate/sacrifice
# ═══════════════════════════════════════════════════════
print("\n═══ R3: Priority modes affect behavior ═══")

# Test hibernate: lights off, temp target reduced
e = fresh_engine()
zone_b = e.state.zones[1]  # zone B
normal_setpoint = zone_b.temperature_setpoint

e.apply_command({"action": "set_zone_priority", "zone_id": "B", "params": {"priority": "hibernate"}})
check("Zone B priority set to hibernate", zone_b.priority == "hibernate")

e.tick(1)
check(
    "Hibernate: lights forced off",
    zone_b.lighting_on == False,
    f"lighting_on={zone_b.lighting_on}",
)
check(
    "Hibernate: PAR level is 0",
    zone_b.par_level == 0.0,
    f"par_level={zone_b.par_level}",
)

# Test sacrifice: no heating (temp should drop toward external)
e3 = fresh_engine()
zone_c = e3.state.zones[2]  # zone C
e3.apply_command({"action": "set_zone_priority", "zone_id": "C", "params": {"priority": "sacrifice"}})
initial_temp = zone_c.temperature
e3.tick(20)
check(
    "Sacrifice: temperature drops significantly (no heating)",
    zone_c.temperature < initial_temp - 1.0,
    f"before={initial_temp}, after={zone_c.temperature}",
)
check(
    "Sacrifice: lights off",
    zone_c.lighting_on == False,
)

# Test low: still functional but reduced heating
e4 = fresh_engine()
zone_d_low = e4.state.zones[3]
e4.apply_command({"action": "set_zone_priority", "zone_id": "D", "params": {"priority": "low"}})
e4.tick(1)
# Low priority zones should still have lights on during daytime (if it's daytime)
# Key thing: they work, just with reduced temp target
check(
    "Low priority accepted",
    zone_d_low.priority == "low",
)

# Test that "high" still keeps lights on at night — tick to night
e5 = fresh_engine()
zone_a5 = e5.state.zones[0]
e5.apply_command({"action": "set_zone_priority", "zone_id": "A", "params": {"priority": "high"}})
# Tick until nighttime
for _ in range(100):
    if not e5.state.environment.is_daytime:
        break
    e5.tick(1)

if not e5.state.environment.is_daytime:
    check(
        "High priority: lights stay on at night",
        zone_a5.lighting_on == True,
        f"lighting_on={zone_a5.lighting_on}",
    )
else:
    print("  (skipped high-priority night test — couldn't reach nighttime in 100 ticks)")


# ═══════════════════════════════════════════════════════
# R4: Sensor reads have random side-effects
# ═══════════════════════════════════════════════════════
print("\n═══ R4: Sensor reads without spontaneous failures ═══")

e = fresh_engine()
e.tick(1)  # ensure state is populated
zone = e.state.zones[0]

null_count = 0
for _ in range(500):
    readings = get_sensor_readings(zone, e.state)
    if readings["temperature"] is None:
        null_count += 1
    if readings["humidity"] is None:
        null_count += 1
    if readings["co2_ppm"] is None:
        null_count += 1
    if readings["par_level"] is None:
        null_count += 1

check(
    "No spontaneous nulls in 500 sensor polls (2000 readings)",
    null_count == 0,
    f"got {null_count} nulls (expected 0)",
)


# ═══════════════════════════════════════════════════════
# R5: Setpoints exposed in API responses
# ═══════════════════════════════════════════════════════
print("\n═══ R5: Setpoints in ground truth ═══")

e = fresh_engine()
zone = e.state.zones[0]
truth = get_ground_truth(zone, e.state)

check(
    "par_setpoint in ground truth",
    "par_setpoint" in truth,
    f"keys: {list(truth.keys())}",
)
check(
    "temperature_setpoint in ground truth",
    "temperature_setpoint" in truth,
    f"keys: {list(truth.keys())}",
)
check(
    "par_setpoint value matches zone",
    truth.get("par_setpoint") == round(zone.par_setpoint, 1),
    f"truth={truth.get('par_setpoint')}, zone={zone.par_setpoint}",
)
check(
    "temperature_setpoint value matches zone",
    truth.get("temperature_setpoint") == round(zone.temperature_setpoint, 2),
    f"truth={truth.get('temperature_setpoint')}, zone={zone.temperature_setpoint}",
)


# ═══════════════════════════════════════════════════════
# R6: Optimizer accepts negative constraints
# ═══════════════════════════════════════════════════════
print("\n═══ R6: Optimizer rejects negative constraints ═══")

from pydantic import ValidationError
from api.simulation_routes import OptimizeRequest

try:
    OptimizeRequest(area_m2=-5.0)
    check("Negative area_m2 rejected", False, "no ValidationError raised")
except ValidationError:
    check("Negative area_m2 rejected", True)

try:
    OptimizeRequest(water_budget_l_per_day=-1.0)
    check("Negative water_budget rejected", False, "no ValidationError raised")
except ValidationError:
    check("Negative water_budget rejected", True)

try:
    OptimizeRequest(power_budget_kw=-10.0)
    check("Negative power_budget rejected", False, "no ValidationError raised")
except ValidationError:
    check("Negative power_budget rejected", True)

# Valid values should still work
try:
    OptimizeRequest(area_m2=0.0, water_budget_l_per_day=100.0, power_budget_kw=5.0)
    check("Valid optimize request accepted", True)
except ValidationError as ex:
    check("Valid optimize request accepted", False, str(ex))


# ═══════════════════════════════════════════════════════
# R7: plant_crop with empty crop_name
# ═══════════════════════════════════════════════════════
print("\n═══ R7: Empty crop_name validation ═══")

e = fresh_engine()

result = e.apply_command({"action": "plant_crop", "zone_id": "A", "params": {"crop_name": ""}})
check(
    "Empty string crop_name returns error",
    result["status"] == "error",
    f"got: {result}",
)
check(
    "Error message mentions crop_name",
    "crop_name" in result.get("message", ""),
    f"message: {result.get('message')}",
)

result2 = e.apply_command({"action": "plant_crop", "zone_id": "A", "params": {}})
check(
    "Missing crop_name returns error",
    result2["status"] == "error",
    f"got: {result2}",
)


# ═══════════════════════════════════════════════════════
# R8: Reset doesn't stop auto-tick (unit test the callback wiring)
# ═══════════════════════════════════════════════════════
print("\n═══ R8: Reset auto-tick stopper callback ═══")

from api.simulation_routes import set_auto_tick_stopper, _auto_tick_stopper

stopper_called = False

async def mock_stopper():
    global stopper_called
    stopper_called = True

set_auto_tick_stopper(mock_stopper)

# Verify the callback is set
from api import simulation_routes
check(
    "Auto-tick stopper callback is set",
    simulation_routes._auto_tick_stopper is not None,
)

# Test the reset endpoint calls the stopper (via asyncio)
import asyncio

async def test_reset_calls_stopper():
    global stopper_called
    stopper_called = False
    # Set up engine
    e = fresh_engine()
    simulation_routes.engine = e
    await simulation_routes.reset()
    return stopper_called

result = asyncio.run(test_reset_calls_stopper())
check(
    "Reset calls auto-tick stopper",
    result == True,
    f"stopper_called={result}",
)


# ═══════════════════════════════════════════════════════
# R9: Event log cap
# ═══════════════════════════════════════════════════════
print("\n═══ R9: Event log capped at 1000 ═══")

e = fresh_engine()

# Manually push 1500 events
for i in range(1500):
    e._log_event("test_event", f"Event {i}")

check(
    "Event log capped at 1000",
    len(e.state.event_log) <= 1000,
    f"count={len(e.state.event_log)}",
)
check(
    "Oldest events were dropped (last entry is Event 1499)",
    e.state.event_log[-1].description == "Event 1499",
    f"last: {e.state.event_log[-1].description}",
)
check(
    "First entry is Event 500 (oldest 500 dropped)",
    e.state.event_log[0].description == "Event 500",
    f"first: {e.state.event_log[0].description}",
)


# ═══════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════
print(f"\n{'═' * 50}")
print(f"Results: {passed} passed, {failed} failed")
if errors:
    print("\nFailed tests:")
    for err in errors:
        print(err)
print(f"{'═' * 50}")

sys.exit(0 if failed == 0 else 1)
