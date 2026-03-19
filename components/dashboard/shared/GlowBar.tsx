"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type GlowColor = "green" | "blue" | "yellow" | "red";

const barColors: Record<GlowColor, string> = {
  green: "bg-mars-green",
  blue: "bg-mars-blue",
  yellow: "bg-mars-yellow",
  red: "bg-mars-red",
};

const glowClasses: Record<GlowColor, string> = {
  green: "glow-green",
  blue: "glow-blue",
  yellow: "glow-yellow",
  red: "glow-red",
};

interface GlowBarProps {
  percent: number;
  color: GlowColor;
  height?: string;
  className?: string;
  thresholds?: { warning: number; critical: number };
}

export function GlowBar({ percent, color, height = "h-2", className, thresholds }: GlowBarProps) {
  let effectiveColor = color;
  if (thresholds) {
    if (percent < thresholds.critical) effectiveColor = "red";
    else if (percent < thresholds.warning) effectiveColor = "yellow";
  }

  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className={cn("w-full rounded-full bg-white/5 overflow-hidden", height, className)}>
      <motion.div
        className={cn("h-full rounded-full", barColors[effectiveColor], glowClasses[effectiveColor])}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      />
    </div>
  );
}
