"""Batch benchmark: 10 seeds x (no_agent, agent) = 20 runs of 100 sols each.

Agent runs execute in parallel across seeds (one Strands Agent per worker thread).

Usage:
    export AWS_ACCESS_KEY_ID=...
    export AWS_SECRET_ACCESS_KEY=...
    export AWS_DEFAULT_REGION=us-west-2
    python3 backend/benchmark.py
"""

from __future__ import annotations

import json
import os
import random
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# Ensure backend/ is on sys.path so imports resolve
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from simulation.engine import SimulationEngine
from simulation.nutrition import compute_nutrition_coverage
from simulation.state import GrowthStage

NUM_SEEDS = 10
NUM_SOLS = 100
MAX_WORKERS = 4  # parallel agent runs
OUTPUT_DIR = BACKEND_DIR / "benchmark_results"

# Thread-local storage so each worker's agent tools route to the right engine
_tls = threading.local()

# Lock protecting the global random module during fast sim ticks
_random_lock = threading.Lock()


def _install_threadlocal_engine_hook() -> None:
    """Monkey-patch agent.tools._get_engine to read from thread-local storage.

    Each worker thread sets _tls.engine before invoking the agent. The agent's
    tool functions call _get_engine(), which now returns the thread's engine.
    """
    import agent.tools as tools_mod

    _original_get_engine = tools_mod._get_engine

    def _tls_get_engine():
        engine = getattr(_tls, "engine", None)
        if engine is not None:
            return engine
        return _original_get_engine()

    tools_mod._get_engine = _tls_get_engine


def snapshot(engine: SimulationEngine, seed: int, mode: str) -> dict:
    """Capture full telemetry snapshot at current simulation state."""
    st = engine.state
    env = st.environment
    res = st.resources

    nutrition = compute_nutrition_coverage(st)
    overall_min = nutrition.pop("overall_min_coverage_percent", 0.0)
    nutrition_out = dict(nutrition)
    nutrition_out["overall_min_coverage_percent"] = overall_min

    zones_out = []
    crops_alive = 0
    crops_dead = 0
    total_biomass = 0.0
    for zone in st.zones:
        crops_out = []
        for crop in zone.crops:
            if crop.growth_stage == GrowthStage.HARVESTED and crop.health <= 0:
                crops_dead += 1
            elif crop.growth_stage == GrowthStage.HARVESTED:
                pass  # harvested but healthy — not dead, just harvested
            elif crop.health <= 0:
                crops_dead += 1
            else:
                crops_alive += 1
            total_biomass += crop.biomass_g
            crops_out.append({
                "crop_name": crop.crop_name,
                "growth_stage": crop.growth_stage.value,
                "health": round(crop.health, 1),
                "biomass_g": round(crop.biomass_g, 1),
                "days_planted": round(crop.days_planted, 1),
            })
        zones_out.append({
            "zone_id": zone.zone_id,
            "temperature": round(zone.temperature, 1),
            "humidity": round(zone.humidity, 1),
            "co2_ppm": round(zone.co2_ppm, 0),
            "par_level": round(zone.par_level, 0),
            "lighting_on": zone.lighting_on,
            "is_quarantined": zone.is_quarantined,
            "priority": zone.priority,
            "crops": crops_out,
        })

    diseases_out = []
    for d in st.diseases:
        diseases_out.append({
            "disease_type": d.disease_type,
            "zone_id": d.zone_id,
            "stage": d.stage,
            "severity": round(d.severity, 1),
            "treated_uvc": d.treated_uvc,
            "treated_h2o2": d.treated_h2o2,
        })

    events_this_sol = list({
        e.event_type for e in st.event_log
        if e.sol == env.sol
    })

    battery_pct = round(
        (res.battery_charge_kwh / res.battery_capacity_kwh) * 100.0, 1
    ) if res.battery_capacity_kwh > 0 else 0.0

    return {
        "seed": seed,
        "mode": mode,
        "sol": env.sol,
        "tick": env.tick,
        "total_ticks": env.total_ticks,
        "crew_health": round(st.crew_health, 1),
        "nutrition": nutrition_out,
        "resources": {
            "water_reservoir_l": round(res.water_reservoir_l, 1),
            "water_consumed_today_l": round(res.water_consumed_today_l, 1),
            "nutrient_solution_ph": round(res.nutrient_solution_ph, 1),
            "nutrient_solution_ec": round(res.nutrient_solution_ec, 1),
            "power_generation_kw": round(res.power_generation_kw, 1),
            "power_consumption_kw": round(res.power_consumption_kw, 1),
            "battery_charge_kwh": round(res.battery_charge_kwh, 1),
            "battery_percent": battery_pct,
            "solar_panel_efficiency": round(res.solar_panel_efficiency, 2),
        },
        "environment": {
            "is_daytime": env.is_daytime,
            "external_temp_c": round(env.external_temp_c, 1),
            "solar_irradiance_w_m2": round(env.solar_irradiance_w_m2, 1),
            "dust_storm_active": env.dust_storm_active,
            "dust_opacity_tau": round(env.dust_opacity_tau, 2),
            "power_failure_active": env.power_failure_active,
        },
        "zones": zones_out,
        "diseases": diseases_out,
        "summary": {
            "crops_alive": crops_alive,
            "crops_dead": crops_dead,
            "total_biomass_g": round(total_biomass, 1),
            "active_diseases": len(st.diseases),
            "events_this_sol": events_this_sol,
        },
    }


def _advance_to_next_sol(engine: SimulationEngine, rng: random.Random) -> int:
    """Tick until the sol number changes. Returns the new sol.

    Uses `rng` to drive deterministic randomness by temporarily replacing
    the global random state while holding _random_lock.
    """
    prev_sol = engine.state.environment.sol
    while True:
        with _random_lock:
            # Swap in this seed's RNG state, tick, swap back
            saved = random.getstate()
            random.setstate(rng.getstate())
            engine.tick()
            rng.setstate(random.getstate())
            random.setstate(saved)
        if engine.state.environment.sol != prev_sol:
            return engine.state.environment.sol


def run_no_agent(seed: int) -> Path:
    """Run 100 sols without agent, return path to JSONL output."""
    rng = random.Random(seed)
    # Seed the global random for engine init (create_default_state is deterministic
    # but _check_random_events uses global random)
    with _random_lock:
        saved = random.getstate()
        random.setstate(rng.getstate())
        engine = SimulationEngine()
        rng.setstate(random.getstate())
        random.setstate(saved)

    out_path = OUTPUT_DIR / f"seed{seed}_no_agent.jsonl"

    with open(out_path, "w") as f:
        f.write(json.dumps(snapshot(engine, seed, "no_agent")) + "\n")

        for _ in range(NUM_SOLS):
            _advance_to_next_sol(engine, rng)
            f.write(json.dumps(snapshot(engine, seed, "no_agent")) + "\n")

    return out_path


def run_agent_seed(seed: int, agent_func) -> Path:
    """Run 100 sols with agent acting every sol. Runs in a worker thread."""
    # Bind this thread's engine for agent tool calls
    rng = random.Random(seed)
    with _random_lock:
        saved = random.getstate()
        random.setstate(rng.getstate())
        engine = SimulationEngine()
        rng.setstate(random.getstate())
        random.setstate(saved)

    _tls.engine = engine
    out_path = OUTPUT_DIR / f"seed{seed}_agent.jsonl"

    with open(out_path, "w") as f:
        f.write(json.dumps(snapshot(engine, seed, "agent")) + "\n")

        for sol_i in range(NUM_SOLS):
            current_sol = _advance_to_next_sol(engine, rng)

            prompt = (
                f"Analyze the current greenhouse state and make decisions. "
                f"Current sol: {current_sol}, tick: {engine.state.environment.tick}. "
                f"Read sensors, check for any issues, and take appropriate actions."
            )
            try:
                agent_func(prompt)
            except Exception as e:
                print(f"  [seed {seed}] Agent error on sol {current_sol}: {e}")

            f.write(json.dumps(snapshot(engine, seed, "agent")) + "\n")

    return out_path


def print_summary(results_dir: Path) -> None:
    """Print a summary table from all JSONL files."""
    rows = []
    for seed in range(NUM_SEEDS):
        for mode in ("no_agent", "agent"):
            path = results_dir / f"seed{seed}_{mode}.jsonl"
            if not path.exists():
                continue
            last_line = ""
            with open(path) as f:
                for line in f:
                    last_line = line
            if not last_line.strip():
                continue
            data = json.loads(last_line)
            cal_pct = data["nutrition"].get("calories_kcal", {}).get("coverage_percent", 0)
            rows.append({
                "seed": seed,
                "mode": mode,
                "crew_health": data["crew_health"],
                "calorie_pct": cal_pct,
                "crops_alive": data["summary"]["crops_alive"],
                "water_l": data["resources"]["water_reservoir_l"],
                "diseases": data["summary"]["active_diseases"],
            })

    print()
    hdr = f"{'Seed':>4} | {'Mode':<9} | {'Crew HP':>8} | {'Cal%':>6} | {'Crops':>5} | {'Water L':>8} | {'Diseases':>8}"
    print(hdr)
    print("-" * len(hdr))
    for r in rows:
        print(
            f"{r['seed']:>4} | {r['mode']:<9} | {r['crew_health']:>8.1f} | "
            f"{r['calorie_pct']:>6.1f} | {r['crops_alive']:>5} | "
            f"{r['water_l']:>8.1f} | {r['diseases']:>8}"
        )

    for mode in ("no_agent", "agent"):
        mode_rows = [r for r in rows if r["mode"] == mode]
        if not mode_rows:
            continue
        n = len(mode_rows)
        print("-" * len(hdr))
        avg_hp = sum(r["crew_health"] for r in mode_rows) / n
        avg_cal = sum(r["calorie_pct"] for r in mode_rows) / n
        avg_crops = sum(r["crops_alive"] for r in mode_rows) / n
        avg_water = sum(r["water_l"] for r in mode_rows) / n
        avg_dis = sum(r["diseases"] for r in mode_rows) / n
        print(
            f" AVG | {mode:<9} | {avg_hp:>8.1f} | "
            f"{avg_cal:>6.1f} | {avg_crops:>5.1f} | "
            f"{avg_water:>8.1f} | {avg_dis:>8.1f}"
        )
    print()


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # --- Phase 1: No-agent runs (fast, sequential) ---
    print(f"=== Phase 1: No-agent runs ({NUM_SEEDS} seeds x {NUM_SOLS} sols) ===")
    t0 = time.time()
    for seed in range(NUM_SEEDS):
        t1 = time.time()
        path = run_no_agent(seed)
        elapsed = time.time() - t1
        print(f"  seed {seed} no_agent done ({elapsed:.1f}s) -> {path.name}")
    print(f"  Phase 1 total: {time.time() - t0:.1f}s\n")

    # --- Phase 2: Agent runs (parallel across seeds) ---
    print(f"=== Phase 2: Agent runs ({NUM_SEEDS} seeds, {MAX_WORKERS} workers) ===")
    from agent.greenhouse_agent import create_agent

    _install_threadlocal_engine_hook()

    # Create one Agent per worker thread (Strands Agent has per-instance lock)
    agents = []
    mcp_clients = []
    for i in range(MAX_WORKERS):
        agent_func, mcp_client = create_agent()
        if agent_func is None:
            break
        agents.append(agent_func)
        if mcp_client is not None:
            mcp_clients.append(mcp_client)

    if not agents:
        print("  WARNING: Agent not available (AWS creds missing?). Skipping agent runs.")
        print("  Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION and re-run.")
    else:
        print(f"  Created {len(agents)} agent instances")
        t0 = time.time()
        try:
            with ThreadPoolExecutor(max_workers=len(agents)) as pool:
                futures = {}
                for seed in range(NUM_SEEDS):
                    # Round-robin assign agents to seeds
                    agent_func = agents[seed % len(agents)]
                    fut = pool.submit(run_agent_seed, seed, agent_func)
                    futures[fut] = seed

                for fut in as_completed(futures):
                    seed = futures[fut]
                    try:
                        path = fut.result()
                        print(f"  seed {seed} agent done -> {path.name}")
                    except Exception as e:
                        print(f"  seed {seed} agent FAILED: {e}")
        finally:
            for mc in mcp_clients:
                try:
                    mc.stop()
                except Exception:
                    pass
        print(f"  Phase 2 total: {time.time() - t0:.1f}s\n")

    # --- Summary ---
    print("=== Summary ===")
    print_summary(OUTPUT_DIR)


if __name__ == "__main__":
    main()
