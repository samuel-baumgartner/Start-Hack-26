"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NutritionData, NutrientInfo } from "@/lib/types";
import { GlowBar } from "../shared/GlowBar";

const CREW = [
  { name: "Commander", icon: "👨‍🚀" },
  { name: "Engineer", icon: "🔧" },
  { name: "Botanist", icon: "🌱" },
  { name: "Medic", icon: "⚕️" },
] as const;

interface AstronautCardProps {
  crewIndex: number;
  nutrition: NutritionData | null;
}

function isNutrientInfo(v: unknown): v is NutrientInfo {
  return typeof v === "object" && v !== null && "coverage_percent" in v;
}

function cleanLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/ Mg$/, "")       // "Vitamin C Mg" → "Vitamin C"
    .replace(/ Ug$/, "")       // "Vitamin D Ug" → "Vitamin D"
    .replace(/ G$/, "")        // "Protein G" → "Protein"
    .replace(/ Kcal$/, "");    // "Calories Kcal" → "Calories"
}

export function AstronautCard({ crewIndex, nutrition }: AstronautCardProps) {
  const [expanded, setExpanded] = useState(false);
  const crew = CREW[crewIndex];

  // Each astronaut gets 1/4 of production
  const nutrients = nutrition
    ? Object.entries(nutrition).filter(([k, v]) => k !== "overall_min_coverage_percent" && isNutrientInfo(v))
    : [];

  const worstCoverage = nutrients.reduce(
    (min, [, v]) => Math.min(min, (v as NutrientInfo).coverage_percent),
    Infinity,
  );
  const normalizedWorst = isFinite(worstCoverage) ? worstCoverage : 0;

  const status: "nominal" | "warning" | "critical" =
    normalizedWorst >= 50 ? "nominal" : normalizedWorst >= 25 ? "warning" : "critical";

  const statusDotColor = {
    nominal: "bg-mars-green",
    warning: "bg-mars-yellow",
    critical: "bg-mars-red",
  };

  return (
    <div
      className="rounded-lg border border-border bg-card overflow-hidden cursor-pointer"
      onClick={() => setExpanded((prev) => !prev)}
    >
      <div className="flex items-center gap-2.5 p-2.5">
        <div className="relative">
          <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
              statusDotColor[status],
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium">{crew.name}</span>
        </div>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-2.5 pb-2.5 space-y-1.5">
              {nutrients.map(([key, val]) => {
                const info = val as NutrientInfo;
                const coverage = info.coverage_percent;
                const label = cleanLabel(key);
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-muted-foreground truncate">{label}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {coverage.toFixed(0)}%
                        <span className="ml-1 opacity-60">
                          ({info.daily_production.toFixed(1)}/{info.daily_requirement.toFixed(1)})
                        </span>
                      </span>
                    </div>
                    <GlowBar
                      percent={coverage}
                      color="green"
                      height="h-1"
                      thresholds={{ warning: 50, critical: 25 }}
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
