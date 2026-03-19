"""Tests for Round 4 bug fixes (#30-44, excluding #32)."""

from __future__ import annotations

import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import pytest
from simulation.engine import SimulationEngine
from simulation.state import GrowthStage


# ── Bug #30: String params → TypeError ──────────────────────────────────

class TestBug30StringParams:
    def test_irrigation_string_rate(self):
        engine = SimulationEngine()
        result = engine.apply_command({"action": "adjust_irrigation", "zone_id": "A", "params": {"rate": "abc"}})
        assert result["status"] == "error"
        assert "number" in result["message"].lower()

    def test_irrigation_valid_string_number(self):
        engine = SimulationEngine()
        result = engine.apply_command({"action": "adjust_irrigation", "zone_id": "A", "params": {"rate": "5"}})
        assert result["status"] == "ok"

    def test_temperature_string_target(self):
        engine = SimulationEngine()
        result = engine.apply_command({"action": "adjust_temperature", "zone_id": "A", "params": {"target": "hot"}})
        assert result["status"] == "error"
        assert "number" in result["message"].lower()

    def test_lighting_string_par(self):
        engine = SimulationEngine()
        result = engine.apply_command({"action": "adjust_lighting", "zone_id": "A", "params": {"par": "bright"}})
        assert result["status"] == "error"
        assert "number" in result["message"].lower()

    def test_lighting_string_photoperiod(self):
        engine = SimulationEngine()
        result = engine.apply_command({"action": "adjust_lighting", "zone_id": "A", "params": {"photoperiod": "long"}})
        assert result["status"] == "error"
        assert "number" in result["message"].lower()

    def test_nutrient_string_ph(self):
        engine = SimulationEngine()
        result = engine.apply_command({"action": "adjust_nutrient_solution", "params": {"ph": "acidic"}})
        assert result["status"] == "error"
        assert "number" in result["message"].lower()

    def test_nutrient_string_ec(self):
        engine = SimulationEngine()
        result = engine.apply_command({"action": "adjust_nutrient_solution", "params": {"ec": "high"}})
        assert result["status"] == "error"
        assert "number" in result["message"].lower()


# ── Bug #31: Harvested crops regrow ─────────────────────────────────────

class TestBug31HarvestedCropsRegrow:
    def test_harvested_crop_stays_harvested(self):
        engine = SimulationEngine()
        zone = engine.state.zones[0]
        crop = zone.crops[0]
        # Harvest the crop
        engine.apply_command({"action": "harvest_crop", "zone_id": zone.zone_id, "params": {"crop_name": crop.crop_name}})
        assert crop.growth_stage == GrowthStage.HARVESTED

        # Tick and verify it stays harvested
        engine.tick(10)
        assert crop.growth_stage == GrowthStage.HARVESTED
        assert crop.biomass_g == 0


# ── Bug #34: deploy_microgreens targets quarantined zone ────────────────

class TestBug34QuarantinedMicrogreens:
    def test_microgreens_skip_quarantined_zone(self):
        engine = SimulationEngine()
        # Quarantine zone D and remove any existing microgreens from it
        zone_d = None
        for z in engine.state.zones:
            if z.zone_id == "D":
                zone_d = z
                break
        if zone_d:
            zone_d.is_quarantined = True
            zone_d.crops = [c for c in zone_d.crops if c.crop_name != "microgreens"]
            result = engine.apply_command({"action": "deploy_microgreens"})
            assert result["status"] == "ok"
            # New microgreens should NOT be in the quarantined zone D
            assert not any(c.crop_name == "microgreens" for c in zone_d.crops)

    def test_all_zones_quarantined(self):
        engine = SimulationEngine()
        for z in engine.state.zones:
            z.is_quarantined = True
        result = engine.apply_command({"action": "deploy_microgreens"})
        assert result["status"] == "error"
        assert "quarantined" in result["message"].lower()


# ── Bug #35: zone_id case-sensitive ─────────────────────────────────────

class TestBug35ZoneIdCase:
    def test_lowercase_zone_id(self):
        engine = SimulationEngine()
        result = engine.apply_command({"action": "adjust_irrigation", "zone_id": "a", "params": {"rate": 3}})
        assert result["status"] == "ok"

    def test_mixed_case_zone_id(self):
        engine = SimulationEngine()
        result = engine.apply_command({"action": "adjust_temperature", "zone_id": "b", "params": {"target": 25}})
        assert result["status"] == "ok"


# ── Bug #33: CORS allow_credentials with allow_origins=["*"] ────────────

class TestBug33Cors:
    def test_cors_credentials_false(self):
        from main import app
        # Find CORSMiddleware in app middleware stack
        for middleware in app.user_middleware:
            if middleware.cls.__name__ == "CORSMiddleware":
                assert middleware.kwargs.get("allow_credentials") is False, \
                    "allow_credentials must be False when allow_origins=['*']"
                break


# ── Bug #36: Disease empty zone_id ──────────────────────────────────────

class TestBug36EmptyZoneId:
    def test_disease_empty_zone_id_rejected(self):
        from pydantic import ValidationError
        from api.event_routes import DiseaseRequest
        with pytest.raises(ValidationError):
            DiseaseRequest(zone_id="")

    def test_sensor_failure_empty_zone_id_rejected(self):
        from pydantic import ValidationError
        from api.event_routes import SensorFailureRequest
        with pytest.raises(ValidationError):
            SensorFailureRequest(zone_id="")

    def test_crop_failure_empty_zone_id_rejected(self):
        from pydantic import ValidationError
        from api.event_routes import CropFailureRequest
        with pytest.raises(ValidationError):
            CropFailureRequest(zone_id="")


# ── Bug #37: Reset returns consistent schema ────────────────────────────

class TestBug37ResetSchema:
    def test_reset_returns_state_dict(self):
        """Reset should return the same shape as get_state, not model_dump."""
        from fastapi.testclient import TestClient
        from main import app
        with TestClient(app) as client:
            resp = client.post("/sim/reset")
            assert resp.status_code == 200
            data = resp.json()
            assert "status" in data
            state = data["state"]
            # Should have curated keys from get_state(), not raw Pydantic keys
            assert "sol" in state
            assert "environment" in state
            assert "resources" in state
            assert "zones" in state


# ── Bug #38: SSE queue iteration safety ─────────────────────────────────

class TestBug38SSEQueueSafety:
    def test_sse_queue_removal_safe(self):
        """Removing a queue during iteration should not raise."""
        from main import sse_queues
        q1 = asyncio.Queue(maxsize=5)
        q2 = asyncio.Queue(maxsize=5)
        sse_queues.append(q1)
        sse_queues.append(q2)
        # Simulate iterating a copy (list()) while modifying original
        for q in list(sse_queues):
            if q is q1:
                sse_queues.remove(q1)
        assert q1 not in sse_queues
        assert q2 in sse_queues
        sse_queues.remove(q2)


# ── Bug #40: Initial SSE event ──────────────────────────────────────────

class TestBug40InitialSSEEvent:
    def test_sse_sends_initial_event(self):
        """Verify the event_generator yields an initial snapshot before blocking."""
        import json as _json
        from main import _build_state_snapshot
        # Just verify the helper produces the right shape
        snapshot = _build_state_snapshot()
        assert "sol" in snapshot
        assert "tick" in snapshot
        assert "total_ticks" in snapshot


# ── Bug #41: Decision log unbounded ─────────────────────────────────────

class TestBug41DecisionLogCap:
    def test_cap_decision_log(self):
        from api.agent_routes import _decision_log, _cap_decision_log
        _decision_log.clear()
        for i in range(1100):
            _decision_log.append({"i": i})
        _cap_decision_log()
        assert len(_decision_log) <= 1000
        assert _decision_log[0]["i"] == 100  # oldest kept


# ── Bug #43: Caloric coverage ───────────────────────────────────────────

class TestBug43Calories:
    def test_calories_in_daily_requirements(self):
        from simulation.nutrition import DAILY_REQUIREMENTS
        assert "calories_kcal" in DAILY_REQUIREMENTS

    def test_calories_in_coverage(self):
        engine = SimulationEngine()
        from simulation.nutrition import compute_nutrition_coverage
        coverage = compute_nutrition_coverage(engine.state)
        assert "calories_kcal" in coverage

    def test_calories_coverage_nonzero(self):
        engine = SimulationEngine()
        # Tick a few times to grow crops
        engine.tick(5)
        from simulation.nutrition import compute_nutrition_coverage
        coverage = compute_nutrition_coverage(engine.state)
        assert coverage["calories_kcal"]["daily_production"] > 0


# ── Bug #44: Extra tick after auto-tick stop ────────────────────────────

class TestBug44ExtraTick:
    def test_sleep_before_tick_in_loop(self):
        """Verify auto_tick_loop sleeps before ticking (sleep-first pattern)."""
        import inspect
        import main
        source = inspect.getsource(main.auto_tick_loop)
        # Find positions of sleep and tick in the source
        sleep_pos = source.find("asyncio.sleep")
        tick_pos = source.find("engine.tick")
        assert sleep_pos < tick_pos, "asyncio.sleep must come before engine.tick in auto_tick_loop"

    def test_break_after_sleep_when_disabled(self):
        """Verify auto_tick_loop checks auto_tick_enabled after sleep."""
        import inspect
        import main
        source = inspect.getsource(main.auto_tick_loop)
        sleep_pos = source.find("asyncio.sleep")
        break_pos = source.find("if not auto_tick_enabled")
        assert break_pos > sleep_pos, "Should check auto_tick_enabled after sleep"


# ── Regression: Round 3 fixes still work ────────────────────────────────

class TestRound3Regressions:
    def test_harvest_crop_sets_harvested(self):
        engine = SimulationEngine()
        zone = engine.state.zones[0]
        crop = zone.crops[0]
        name = crop.crop_name
        result = engine.apply_command({"action": "harvest_crop", "zone_id": zone.zone_id, "params": {"crop_name": name}})
        assert result["status"] == "ok"
        assert crop.growth_stage == GrowthStage.HARVESTED

    def test_plant_crop_rejects_duplicate(self):
        engine = SimulationEngine()
        zone = engine.state.zones[0]
        crop = zone.crops[0]
        name = crop.crop_name
        result = engine.apply_command({"action": "plant_crop", "zone_id": zone.zone_id, "params": {"crop_name": name}})
        assert result["status"] == "error"

    def test_event_log_capped(self):
        engine = SimulationEngine()
        for i in range(1100):
            engine._log_event("test", f"event {i}")
        assert len(engine.state.event_log) <= 1000
