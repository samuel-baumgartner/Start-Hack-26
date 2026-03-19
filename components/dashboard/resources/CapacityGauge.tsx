"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { GlowBar } from "../shared/GlowBar";
import type { LucideIcon } from "lucide-react";

interface CapacityGaugeProps {
  icon: LucideIcon;
  label: string;
  value: number;
  unit: string;
  percent: number;
  subLabel?: string;
  color: "green" | "blue" | "yellow";
  index: number;
}

export function CapacityGauge({
  icon: Icon,
  label,
  value,
  unit,
  percent,
  subLabel,
  color,
  index,
}: CapacityGaugeProps) {
  const colorClasses = {
    green: "text-mars-green",
    blue: "text-mars-blue",
    yellow: "text-mars-yellow",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.08, duration: 0.4 }}
      className="rounded-lg border border-border bg-card p-4 flex flex-col"
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className={cn("h-4 w-4", colorClasses[color])} />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5 mb-3">
        <span className={cn("text-2xl font-bold font-mono data-value", colorClasses[color])}>
          {value.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>

      <GlowBar
        percent={percent}
        color={color}
        thresholds={{ warning: 40, critical: 20 }}
        className="mb-2"
      />

      {subLabel && (
        <span className="text-[10px] font-mono text-muted-foreground mt-auto">
          {subLabel}
        </span>
      )}
    </motion.div>
  );
}
