"use client";

import { useState, useCallback } from "react";
import type { ChatMessage, NutrientInfo } from "@/lib/types";
import { postAgentQuery, getSimState, getSimNutrition } from "@/lib/api";

function isNutrientInfo(v: unknown): v is NutrientInfo {
  return typeof v === "object" && v !== null && "coverage_percent" in v;
}

async function buildContextPrefix(): Promise<string> {
  try {
    const [state, nutrition] = await Promise.all([getSimState(), getSimNutrition()]);

    const nutrientLines = Object.entries(nutrition)
      .filter(([k, v]) => k !== "overall_min_coverage_percent" && isNutrientInfo(v))
      .map(([k, v]) => {
        const info = v as NutrientInfo;
        return `  ${k}: ${info.coverage_percent.toFixed(1)}% coverage (${info.daily_production.toFixed(1)}/${info.daily_requirement.toFixed(1)})`;
      })
      .join("\n");

    const alerts: string[] = [];
    if (state.environment.dust_storm_active) alerts.push("DUST STORM ACTIVE");
    if (state.environment.disease_active) alerts.push(`DISEASE in zone ${state.environment.disease_zone_id}`);
    if (state.environment.power_failure_active) alerts.push("POWER FAILURE");
    if (state.resources.battery_percent < 20) alerts.push(`LOW BATTERY (${state.resources.battery_percent.toFixed(0)}%)`);
    if (state.resources.water_reservoir_l < 50) alerts.push(`LOW WATER (${state.resources.water_reservoir_l.toFixed(1)}L)`);

    return [
      `[CURRENT SIMULATION STATE — Sol ${state.sol}, Tick ${state.tick}/${state.total_ticks}, ${state.is_daytime ? "Day" : "Night"}]`,
      `Water: ${state.resources.water_reservoir_l.toFixed(1)}L | Battery: ${state.resources.battery_percent.toFixed(0)}% | Power: ${state.resources.power_generation_kw.toFixed(1)}/${state.resources.power_consumption_kw.toFixed(1)} kW`,
      `Nutrition coverage (overall min: ${(nutrition.overall_min_coverage_percent as number).toFixed(1)}%):`,
      nutrientLines,
      alerts.length > 0 ? `ACTIVE ALERTS: ${alerts.join(", ")}` : "No active alerts",
      `Zones: ${state.zones.length} | Crops: ${state.zones.reduce((n, z) => n + z.crops.length, 0)}`,
      "---",
      "User question: ",
    ].join("\n");
  } catch {
    return "";
  }
}

export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const contextPrefix = await buildContextPrefix();
      const enrichedMessage = contextPrefix + content;
      const res = await postAgentQuery(enrichedMessage);
      const agentMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        content: res.response,
        timestamp: res.timestamp,
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        content: "Connection to AI agent failed. Check backend status.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { messages, isLoading, sendMessage };
}
