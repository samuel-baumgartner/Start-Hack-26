import type { HealthLevel, Urgency } from "@/types/greenhouse";

export function getLevelByValue(value: number): HealthLevel {
  if (value < 40) return "critical";
  if (value < 70) return "warning";
  return "healthy";
}

export function levelColors(level: HealthLevel): { text: string; soft: string; solid: string } {
  if (level === "critical") {
    return {
      text: "text-[#b91c1c]",
      soft: "bg-[#fef2f2] border-[#fecaca]",
      solid: "bg-[#ef4444]",
    };
  }
  if (level === "warning") {
    return {
      text: "text-[#b45309]",
      soft: "bg-amber-50 border-amber-200",
      solid: "bg-amber-500",
    };
  }
  return {
    text: "text-[#166534]",
    soft: "bg-emerald-50 border-emerald-200",
    solid: "bg-[#009f3c]",
  };
}

export function urgencyBorder(urgency: Urgency): string {
  if (urgency === "critical") return "border-l-[#ef4444]";
  if (urgency === "warning") return "border-l-[#f59e0b]";
  return "border-l-[#009f3c]";
}

export function fvfmLevel(value: number): HealthLevel {
  if (value < 0.6) return "critical";
  if (value <= 0.75) return "warning";
  return "healthy";
}
