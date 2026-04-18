"use client";

import { useEffect, useState, useCallback } from "react";
import {
  getSimState,
  getSimSensors,
  getSimNutrition,
  postSimTick,
  postSimTickN,
  postAgentTick,
  getAgentDecisions,
  getEventLog,
  startAutoTick,
  stopAutoTick,
  getAutoTickStatus,
  triggerDustStorm,
  triggerDisease,
  triggerPowerFailure,
  resetSim,
} from "@/lib/api";
import type { SimState, AgentDecision, NutritionData, AutoTickStatus } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = Record<string, any>;

const POLL_MS = 2000;

function parseDecisions(r: unknown): AgentDecision[] {
  if (Array.isArray(r)) return r;
  if (r && typeof r === "object" && "decisions" in r) {
    const d = (r as { decisions: unknown }).decisions;
    return Array.isArray(d) ? d : [];
  }
  return [];
}

export default function BenchPage() {
  const [state, setState] = useState<SimState | null>(null);
  const [sensors, setSensors] = useState<unknown>(null);
  const [nutrition, setNutrition] = useState<NutritionData | null>(null);
  const [decisions, setDecisions] = useState<AgentDecision[]>([]);
  const [events, setEvents] = useState<AnyObj[]>([]);
  const [autoTick, setAutoTick] = useState<AutoTickStatus | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [s, sens, nut, decs, evts, at] = await Promise.all([
        getSimState(),
        getSimSensors(),
        getSimNutrition(),
        getAgentDecisions(20).then(parseDecisions),
        getEventLog(),
        getAutoTickStatus(),
      ]);
      setState(s);
      setSensors(sens);
      setNutrition(nut);
      setDecisions(decs);
      setEvents(Array.isArray(evts) ? evts.slice(-30) : []);
      setAutoTick(at);
    } catch {
      /* silently retry next poll */
    }
  }, []);

  useEffect(() => {
    // Initial fetch + polling subscription
    const immediateId = setTimeout(refresh, 0);
    const id = setInterval(refresh, POLL_MS);
    return () => {
      clearTimeout(immediateId);
      clearInterval(id);
    };
  }, [refresh]);

  const act = async (fn: () => Promise<unknown>) => {
    await fn();
    await refresh();
  };

  if (!state) return <pre style={{ fontFamily: "monospace", padding: 16, background: "#1a1a2e", color: "#e0e0e0" }}>Loading...</pre>;

  const env = state.environment;
  const res = state.resources;

  return (
    <div
      style={{
        fontFamily: "monospace",
        fontSize: 13,
        padding: 16,
        maxWidth: 1200,
        background: "#1a1a2e",
        color: "#e0e0e0",
        minHeight: "100vh",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <h2 style={{ margin: "0 0 8px" }}>Bench — Mars Greenhouse</h2>

      {/* ── Controls ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
        <button style={btnStyle} onClick={() => act(resetSim)}>Reset</button>
        <button style={btnStyle} onClick={() => act(postSimTick)}>Tick x1</button>
        <button style={btnStyle} onClick={() => act(() => postSimTickN(10))}>Tick x10</button>
        <button style={btnStyle} onClick={() => act(() => startAutoTick(5))}>
          Start Auto-tick
        </button>
        <button style={btnStyle} onClick={() => act(stopAutoTick)}>Stop Auto-tick</button>
        <button style={btnStyle} onClick={() => act(postAgentTick)}>Agent Tick</button>
        <span style={{ width: 16 }} />
        <button style={btnStyle} onClick={() => act(triggerDustStorm)}>Dust Storm</button>
        <button style={btnStyle} onClick={() => act(() => triggerDisease("C", "pythium_root_rot"))}>
          Disease: pythium C
        </button>
        <button style={btnStyle} onClick={() => act(() => triggerDisease("C", "powdery_mildew"))}>
          Disease: mildew C
        </button>
        <button style={btnStyle} onClick={() => act(() => triggerDisease("A", "fusarium_wilt"))}>
          Disease: wilt A
        </button>
        <button style={btnStyle} onClick={() => act(triggerPowerFailure)}>Power Fail</button>
      </div>

      {/* ── Status ── */}
      <div style={{ background: "#111", color: "#0f0", padding: "4px 8px", marginBottom: 8 }}>
        Sol {state.sol} | Tick {state.tick} | {state.is_daytime ? "Day" : "Night"} | Water:{" "}
        {res.water_reservoir_l.toFixed(0)}L | Battery: {res.battery_percent.toFixed(0)}% | Power:{" "}
        {res.power_generation_kw.toFixed(1)}/{res.power_consumption_kw.toFixed(1)} kW | Storm:{" "}
        {env.dust_storm_active ? `yes (${env.dust_storm_remaining_sols} sols)` : "no"} | Disease:{" "}
        {env.disease_active ? `yes (${env.disease_zone_id})` : "no"} | Power Fail:{" "}
        {env.power_failure_active ? "yes" : "no"} | Auto-tick:{" "}
        {autoTick?.enabled ? `on (${autoTick.interval}s)` : "off"}
      </div>

      {/* ── Nutrition ── */}
      {nutrition && (
        <details style={{ marginBottom: 8 }}>
          <summary style={{ cursor: "pointer" }}>
            Nutrition — min coverage: {nutrition.overall_min_coverage_percent}%
          </summary>
          <pre style={{ background: "#1e1e30", color: "#ccc", padding: 8, overflow: "auto", maxHeight: 300 }}>
            {JSON.stringify(nutrition, null, 2)}
          </pre>
        </details>
      )}

      {/* ── Zones ── */}
      <h3 style={{ margin: "8px 0 4px" }}>Zones</h3>
      <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 8 }}>
        <thead>
          <tr>
            {["Zone", "Temp", "Humidity", "CO2", "PAR", "Lights", "Irrigation", "Quarantined", "Priority"].map(
              (h) => (
                <th key={h} style={th}>
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {state.zones.map((z) => (
            <tr key={z.zone_id}>
              <td style={td}>{z.zone_id}</td>
              <td style={td}>{z.temperature.toFixed(1)}</td>
              <td style={td}>{z.humidity.toFixed(1)}</td>
              <td style={td}>{z.co2_ppm.toFixed(0)}</td>
              <td style={td}>{z.par_level.toFixed(0)}</td>
              <td style={td}>{z.lighting_on ? "ON" : "off"}</td>
              <td style={td}>{z.irrigation_rate.toFixed(2)}</td>
              <td style={td}>{z.is_quarantined ? "YES" : "no"}</td>
              <td style={td}>{z.priority}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Crops ── */}
      <h3 style={{ margin: "8px 0 4px" }}>Crops</h3>
      <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 8 }}>
        <thead>
          <tr>
            {["Zone", "Crop", "Stage", "Health", "Biomass (g)", "Days Left"].map((h) => (
              <th key={h} style={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {state.zones.flatMap((z) =>
            z.crops.map((c, i) => (
              <tr key={`${z.zone_id}-${i}`}>
                <td style={td}>{z.zone_id}</td>
                <td style={td}>{c.name}</td>
                <td style={td}>{c.growth_stage}</td>
                <td style={{ ...td, color: c.health < 50 ? "red" : c.health < 75 ? "orange" : "#4caf50" }}>
                  {c.health.toFixed(1)}
                </td>
                <td style={td}>{c.biomass_g.toFixed(1)}</td>
                <td style={td}>{c.days_to_harvest}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* ── Sensors (raw) ── */}
      <details style={{ marginBottom: 8 }}>
        <summary style={{ cursor: "pointer" }}>Sensor Readings (raw JSON)</summary>
        <pre style={{ background: "#1e1e30", color: "#ccc", padding: 8, overflow: "auto", maxHeight: 400 }}>
          {JSON.stringify(sensors, null, 2)}
        </pre>
      </details>

      {/* ── Agent Decisions ── */}
      <h3 style={{ margin: "8px 0 4px" }}>Agent Decisions (last 20)</h3>
      {decisions.length === 0 && <p>No decisions yet.</p>}
      {decisions
        .slice()
        .reverse()
        .map((d, i) => (
          <details key={i} style={{ marginBottom: 2 }}>
            <summary>
              Sol {d.sol} Tick {d.tick} — {d.action} — {d.timestamp}
            </summary>
            <pre style={{ background: "#1e1e30", color: "#ccc", padding: 8, whiteSpace: "pre-wrap" }}>
              {d.reasoning}
            </pre>
          </details>
        ))}

      {/* ── Event Log ── */}
      <h3 style={{ margin: "8px 0 4px" }}>Event Log (last 30)</h3>
      <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 8 }}>
        <thead>
          <tr>
            {["Sol", "Tick", "Type", "Description", "Zones"].map((h) => (
              <th key={h} style={th}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {events
            .slice()
            .reverse()
            .map((e, i) => (
              <tr key={i}>
                <td style={td}>{e.sol ?? "—"}</td>
                <td style={td}>{e.tick ?? "—"}</td>
                <td style={td}>{e.type ?? e.event_type ?? "—"}</td>
                <td style={td}>{e.description ?? e.message ?? "—"}</td>
                <td style={td}>{e.zones ? (Array.isArray(e.zones) ? e.zones.join(", ") : e.zones) : "—"}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

const th: React.CSSProperties = {
  border: "1px solid #444",
  padding: "2px 6px",
  background: "#2a2a3e",
  color: "#ccc",
  textAlign: "left",
  fontSize: 12,
};

const td: React.CSSProperties = {
  border: "1px solid #333",
  padding: "2px 6px",
  color: "#ddd",
  fontSize: 12,
};

const btnStyle: React.CSSProperties = {
  background: "#333",
  color: "#eee",
  border: "1px solid #555",
  cursor: "pointer",
  padding: "4px 8px",
  fontSize: 12,
};
