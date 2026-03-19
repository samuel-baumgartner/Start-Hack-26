"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SimState, SSEUpdate } from "@/lib/types";
import { getSimState, postSimTick, subscribeSSE } from "@/lib/api";
import { MOCK_STATE } from "@/lib/mock-data";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export function useGreenhouse() {
  const [state, setState] = useState<SimState | null>(USE_MOCK ? MOCK_STATE : null);
  const [isLoading, setIsLoading] = useState(!USE_MOCK);
  const [error, setError] = useState<string | null>(null);
  const sseCountRef = useRef(0);

  const fetchState = useCallback(async () => {
    if (USE_MOCK) return;
    try {
      const data = await getSimState();
      setState(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch state");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const tick = useCallback(async () => {
    if (USE_MOCK) {
      setState((prev) => prev ? { ...prev, tick: (prev.tick % 4) + 1, total_ticks: prev.total_ticks + 1 } : prev);
      return;
    }
    try {
      const data = await postSimTick();
      setState(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tick failed");
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  // SSE subscription
  useEffect(() => {
    if (USE_MOCK) return;

    const cleanup = subscribeSSE((data) => {
      const update = data as SSEUpdate;
      sseCountRef.current += 1;

      // Merge lightweight SSE update into state
      setState((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sol: update.sol,
          tick: update.tick,
          total_ticks: update.total_ticks,
          is_daytime: update.is_daytime,
          environment: { ...prev.environment, dust_storm_active: update.dust_storm_active },
          resources: {
            ...prev.resources,
            water_reservoir_l: update.water_reservoir_l,
            battery_percent: update.battery_percent,
            power_generation_kw: update.power_generation_kw,
            power_consumption_kw: update.power_consumption_kw,
          },
        };
      });

      // Full re-fetch every 5th event for zone-level changes
      if (sseCountRef.current % 5 === 0) {
        fetchState();
      }
    }, () => {
      // On SSE error, try reconnecting after a delay
      setTimeout(() => fetchState(), 3000);
    });

    return cleanup;
  }, [fetchState]);

  return { state, isLoading, error, refetch: fetchState, tick };
}
