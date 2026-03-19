import type { SimState, NutritionData, AgentResponse, AutoTickStatus, AgentDecision } from "./types";

const BASE = "/api";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json() as Promise<T>;
}

// ── Simulation ──
export const getSimState = () => fetchJSON<SimState>(`${BASE}/sim/state`);
export const getSimSensors = () => fetchJSON<unknown>(`${BASE}/sim/sensors`);
export const getSimNutrition = () => fetchJSON<NutritionData>(`${BASE}/sim/nutrition`);
export const postSimTick = () => fetchJSON<SimState>(`${BASE}/sim/tick`, { method: "POST" });

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
