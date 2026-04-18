import type { SimState, NutritionData, AgentResponse, AutoTickStatus, AgentDecision } from "./types";

/** Vercel: FastAPI is mounted at `/_/backend` (see repo `vercel.json`). Local: `next dev` uses `next.config` rewrites from `/api`. */
export const API_BASE =
  process.env.NEXT_PUBLIC_VERCEL_ENV !== undefined ? "/_/backend" : "/api";

const BASE = API_BASE;

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ── Simulation ──
export const getSimState = () => fetchJSON<SimState>(`${BASE}/sim/state`);
export const getSimSensors = () => fetchJSON<unknown>(`${BASE}/sim/sensors`);
export const getSimNutrition = () => fetchJSON<NutritionData>(`${BASE}/sim/nutrition`);
export const postSimTick = () =>
  fetchJSON<SimState>(`${BASE}/sim/tick`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ n: 1 }),
  });

// ── Agent ──
export const postAgentQuery = (message: string) =>
  fetchJSON<AgentResponse>(`${BASE}/agent/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

export const postAgentTick = () =>
  fetchJSON<unknown>(`${BASE}/agent/tick`, { method: "POST" });

export const getAgentDecisions = (limit = 10) =>
  fetchJSON<AgentDecision[]>(`${BASE}/agent/decisions?limit=${limit}`);

// ── Auto-tick ──
export const startAutoTick = (interval = 5) =>
  fetchJSON<unknown>(`${BASE}/auto-tick/start?interval=${interval}`, { method: "POST" });

export const stopAutoTick = () =>
  fetchJSON<unknown>(`${BASE}/auto-tick/stop`, { method: "POST" });

export const getAutoTickStatus = () =>
  fetchJSON<AutoTickStatus>(`${BASE}/auto-tick/status`);

// ── Events ──
export const getEventLog = () => fetchJSON<unknown>(`${BASE}/events/log`);

// ── Events (trigger) ──
export const triggerDustStorm = (severity = "regional") =>
  fetchJSON<unknown>(`${BASE}/events/dust-storm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ severity }),
  });

export const triggerDisease = (zone_id = "C", disease_type = "pythium_root_rot") =>
  fetchJSON<unknown>(`${BASE}/events/disease`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ zone_id, disease_type }),
  });

export const triggerPowerFailure = (reduction = 0.5) =>
  fetchJSON<unknown>(`${BASE}/events/power-failure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reduction }),
  });

// ── Simulation (extended) ──
export const postSimTickN = (n = 1) =>
  fetchJSON<SimState>(`${BASE}/sim/tick`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ n }),
  });

export const resetSim = () =>
  fetchJSON<unknown>(`${BASE}/sim/reset`, { method: "POST" });

// ── SSE ──
export function subscribeSSE(onMessage: (data: unknown) => void, onError?: () => void) {
  const es = new EventSource(`${BASE}/sim/stream`);
  es.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data));
    } catch { /* ignore parse errors */ }
  };
  es.onerror = () => onError?.();
  return () => es.close();
}
