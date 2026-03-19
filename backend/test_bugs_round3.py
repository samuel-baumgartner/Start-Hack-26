"""Tests for BUGS.md Round 3 fixes (bugs #4, #6, #9, #10, #16, #17, #18, #23, #24, #25, #26, #29).

Also includes regression tests for previously-fixed bugs.
"""

import pytest
from fastapi.testclient import TestClient

from simulation.engine import SimulationEngine
from simulation.events import trigger_event


@pytest.fixture
def engine():
    return SimulationEngine()


# ---------------------------------------------------------------------------
# Helper: build a FastAPI app with test client
# ---------------------------------------------------------------------------
@pytest.fixture
def client(engine):
    from fastapi import FastAPI
    from api.simulation_routes import router as sim_router, set_engine as set_sim_engine
    from api.event_routes import router as event_router, set_engine as set_event_engine

    app = FastAPI()
    app.include_router(sim_router)
    app.include_router(event_router)
    set_sim_engine(engine)
    set_event_engine(engine)
    return TestClient(app)


# ===========================================================================
# Bug #4: deploy_microgreens unbounded
# ===========================================================================
class TestBug4MicrogreensCap:
    def test_deploy_up_to_cap(self, engine):
        # Zone F starts with 1 microgreens, so 2 more should succeed (total 3)
        for i in range(2):
            r = engine.apply_command({"action": "deploy_microgreens"})
            assert r["status"] == "ok", f"Deploy {i+1} should succeed"

    def test_deploy_beyond_cap_rejected(self, engine):
        # Zone F starts with 1, deploy 2 more to hit cap of 3
        for _ in range(2):
            engine.apply_command({"action": "deploy_microgreens"})
        r = engine.apply_command({"action": "deploy_microgreens"})
        assert r["status"] == "error"
        assert "Maximum" in r["message"]


# ===========================================================================
# Bug #6: HTTP 200 for app-level errors → should be 400
# ===========================================================================
class TestBug6HttpErrorCodes:
    def test_command_error_returns_400(self, client):
        resp = client.post("/sim/command", json={
            "action": "adjust_irrigation",
            "zone_id": "NONEXISTENT",
            "params": {}
        })
        assert resp.status_code == 400

    def test_command_success_returns_200(self, client):
        resp = client.post("/sim/command", json={
            "action": "adjust_irrigation",
            "zone_id": "A",
            "params": {"rate": 1.0}
        })
        assert resp.status_code == 200

    def test_event_error_returns_400(self, client):
        resp = client.post("/events/disease", json={"zone_id": "NONEXISTENT"})
        assert resp.status_code == 400

    def test_event_success_returns_200(self, client):
        resp = client.post("/events/disease", json={"zone_id": "C"})
        assert resp.status_code == 200

    def test_dust_storm_invalid_severity_400(self, client):
        resp = client.post("/events/dust-storm", json={"severity": "mega"})
        assert resp.status_code == 400

    def test_sensor_failure_bad_zone_400(self, client):
        resp = client.post("/events/sensor-failure", json={"zone_id": "ZZ"})
        assert resp.status_code == 400


# ===========================================================================
# Bug #9: Sensor-failure accepts negative duration
# ===========================================================================
class TestBug9SensorDuration:
    def test_negative_duration_rejected(self, engine):
        r = trigger_event(engine, "sensor_failure", {
            "zone_id": "A", "sensor_name": "temperature", "duration_ticks": -5
        })
        assert r["status"] == "error"
        assert "duration_ticks" in r["message"]

    def test_zero_duration_rejected(self, engine):
        r = trigger_event(engine, "sensor_failure", {
            "zone_id": "A", "sensor_name": "temperature", "duration_ticks": 0
        })
        assert r["status"] == "error"

    def test_positive_duration_accepted(self, engine):
        r = trigger_event(engine, "sensor_failure", {
            "zone_id": "A", "sensor_name": "temperature", "duration_ticks": 5
        })
        assert r["status"] == "ok"


# ===========================================================================
# Bug #10: Dust storm negative params accepted
# ===========================================================================
class TestBug10DustStormParams:
    def test_negative_opacity_rejected(self, engine):
        r = trigger_event(engine, "dust_storm", {"opacity_tau": -1.0})
        assert r["status"] == "error"
        assert "opacity_tau" in r["message"]

    def test_negative_duration_rejected(self, engine):
        r = trigger_event(engine, "dust_storm", {"duration_sols": -5})
        assert r["status"] == "error"
        assert "duration_sols" in r["message"]

    def test_zero_duration_rejected(self, engine):
        r = trigger_event(engine, "dust_storm", {"duration_sols": 0})
        assert r["status"] == "error"

    def test_valid_params_accepted(self, engine):
        r = trigger_event(engine, "dust_storm", {"opacity_tau": 3.0, "duration_sols": 10})
        assert r["status"] == "ok"


# ===========================================================================
# Bug #16: Dust storm invalid severity accepted
# ===========================================================================
class TestBug16DustStormSeverity:
    def test_invalid_severity_rejected(self, engine):
        r = trigger_event(engine, "dust_storm", {"severity": "mega"})
        assert r["status"] == "error"
        assert "severity" in r["message"]

    def test_regional_accepted(self, engine):
        r = trigger_event(engine, "dust_storm", {"severity": "regional"})
        assert r["status"] == "ok"

    def test_global_accepted(self, engine):
        r = trigger_event(engine, "dust_storm", {"severity": "global"})
        assert r["status"] == "ok"


# ===========================================================================
# Bug #17: Empty action string accepted
# ===========================================================================
class TestBug17EmptyAction:
    def test_empty_action_rejected_by_pydantic(self, client):
        resp = client.post("/sim/command", json={"action": "", "params": {}})
        assert resp.status_code == 422  # Pydantic validation error


# ===========================================================================
# Bug #18: harvest_crop missing crop_name → "Crop None not found"
# ===========================================================================
class TestBug18HarvestCropName:
    def test_missing_crop_name_error(self, engine):
        r = engine.apply_command({"action": "harvest_crop", "zone_id": "A", "params": {}})
        assert r["status"] == "error"
        assert "crop_name is required" in r["message"]

    def test_null_crop_name_error(self, engine):
        r = engine.apply_command({"action": "harvest_crop", "zone_id": "A", "params": {"crop_name": None}})
        assert r["status"] == "error"
        assert "crop_name is required" in r["message"]


# ===========================================================================
# Bug #23: quarantine_zone accepts non-boolean
# ===========================================================================
class TestBug23QuarantineBool:
    def test_string_coerced_to_bool(self, engine):
        r = engine.apply_command({"action": "quarantine_zone", "zone_id": "A", "params": {"quarantine": "yes"}})
        assert r["status"] == "ok"
        zone = engine._get_zone("A")
        assert isinstance(zone.is_quarantined, bool)
        assert zone.is_quarantined is True

    def test_string_false_coerced_correctly(self, engine):
        """Critical: bool("false") is True in Python, so string parsing must handle this."""
        engine.apply_command({"action": "quarantine_zone", "zone_id": "A", "params": {"quarantine": True}})
        r = engine.apply_command({"action": "quarantine_zone", "zone_id": "A", "params": {"quarantine": "false"}})
        assert r["status"] == "ok"
        zone = engine._get_zone("A")
        assert zone.is_quarantined is False

    def test_int_coerced_to_bool(self, engine):
        r = engine.apply_command({"action": "quarantine_zone", "zone_id": "A", "params": {"quarantine": 0}})
        assert r["status"] == "ok"
        zone = engine._get_zone("A")
        assert zone.is_quarantined is False


# ===========================================================================
# Bug #24: Irrigation rate unbounded
# ===========================================================================
class TestBug24IrrigationCap:
    def test_rate_above_10_rejected(self, engine):
        r = engine.apply_command({"action": "adjust_irrigation", "zone_id": "A", "params": {"rate": 100}})
        assert r["status"] == "error"
        assert "10" in r["message"]

    def test_rate_at_10_accepted(self, engine):
        r = engine.apply_command({"action": "adjust_irrigation", "zone_id": "A", "params": {"rate": 10}})
        assert r["status"] == "ok"

    def test_negative_rate_rejected(self, engine):
        r = engine.apply_command({"action": "adjust_irrigation", "zone_id": "A", "params": {"rate": -1}})
        assert r["status"] == "error"


# ===========================================================================
# Bug #25: adjust_lighting `on` accepts string, corrupts type
# ===========================================================================
class TestBug25LightingBool:
    def test_string_false_sets_off(self, engine):
        engine.apply_command({"action": "adjust_lighting", "zone_id": "A", "params": {"on": "false"}})
        zone = engine._get_zone("A")
        assert zone.lighting_on is False

    def test_string_true_sets_on(self, engine):
        engine.apply_command({"action": "adjust_lighting", "zone_id": "A", "params": {"on": "true"}})
        zone = engine._get_zone("A")
        assert zone.lighting_on is True

    def test_bool_true_preserved(self, engine):
        engine.apply_command({"action": "adjust_lighting", "zone_id": "A", "params": {"on": True}})
        zone = engine._get_zone("A")
        assert zone.lighting_on is True

    def test_bool_false_preserved(self, engine):
        engine.apply_command({"action": "adjust_lighting", "zone_id": "A", "params": {"on": False}})
        zone = engine._get_zone("A")
        assert zone.lighting_on is False

    def test_result_is_always_bool(self, engine):
        engine.apply_command({"action": "adjust_lighting", "zone_id": "A", "params": {"on": "yes"}})
        zone = engine._get_zone("A")
        assert isinstance(zone.lighting_on, bool)


# ===========================================================================
# Bug #26: zone_id null → "Zone 'None' not found" (improved message)
# ===========================================================================
class TestBug26ZoneIdNull:
    def test_null_zone_id_gives_required_message(self, engine):
        r = engine.apply_command({"action": "adjust_irrigation", "zone_id": None, "params": {}})
        assert r["status"] == "error"
        assert "zone_id is required" in r["message"]

    def test_missing_zone_id_gives_required_message(self, engine):
        r = engine.apply_command({"action": "adjust_irrigation", "params": {}})
        assert r["status"] == "error"
        assert "zone_id is required" in r["message"]

    def test_invalid_zone_id_gives_not_found(self, engine):
        r = engine.apply_command({"action": "adjust_irrigation", "zone_id": "ZZ", "params": {}})
        assert r["status"] == "error"
        assert "not found" in r["message"]


# ===========================================================================
# Bug #29: Crop names case-sensitive
# ===========================================================================
class TestBug29CropNameCase:
    def test_plant_crop_case_insensitive(self, engine):
        r = engine.apply_command({"action": "plant_crop", "zone_id": "A", "params": {"crop_name": "Lettuce"}})
        # Should succeed (normalized to "lettuce") or error if already planted
        # The key check: it doesn't fail with "Unknown crop"
        assert r["status"] in ("ok", "error")
        if r["status"] == "error":
            assert "Unknown crop" not in r["message"]

    def test_harvest_crop_case_insensitive(self, engine):
        # Plant with lowercase, then harvest with mixed case
        engine.apply_command({"action": "plant_crop", "zone_id": "A", "params": {"crop_name": "microgreens"}})
        # Advance a tick so the crop has some biomass
        engine.tick(1)
        r = engine.apply_command({"action": "harvest_crop", "zone_id": "A", "params": {"crop_name": "Microgreens"}})
        assert r["status"] == "ok", f"Expected harvest to succeed with mixed case, got: {r}"


# ===========================================================================
# Regression: previously fixed bugs still pass
# ===========================================================================
class TestRegressions:
    """Verify previously-fixed bugs haven't regressed."""

    def test_bug1_lighting_off_preserved_on_tick(self, engine):
        """Bug #1: adjust_lighting on=False shouldn't be overwritten on tick."""
        engine.apply_command({"action": "adjust_lighting", "zone_id": "A", "params": {"on": False}})
        engine.tick(1)
        zone = engine._get_zone("A")
        assert zone.lighting_on is False, "lighting_on should stay False after tick"

    def test_bug5_water_counter_reset(self, engine):
        """Bug #5: water_consumed_today_l resets before update_water."""
        # Just ensure tick doesn't crash — ordering is structural
        engine.tick(4)
        assert engine.state.resources.water_consumed_today_l >= 0

    def test_bug7_missing_zone_id(self, engine):
        """Bug #7: missing zone_id no longer gives 'Unknown action'."""
        r = engine.apply_command({"action": "adjust_irrigation"})
        assert r["status"] == "error"
        assert "Unknown action" not in r["message"]

    def test_bug8_negative_optimize_constraints(self, client):
        """Bug #8: optimizer rejects negative constraints via Pydantic."""
        resp = client.post("/sim/optimize", json={"area_m2": -10})
        assert resp.status_code == 422

    def test_bug15_reset_works(self, client):
        """Bug #15: reset endpoint works without error."""
        resp = client.post("/sim/reset")
        assert resp.status_code == 200
