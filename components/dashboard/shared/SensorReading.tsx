"use client";

import { cn } from "@/lib/utils";
import {
  Thermometer,
  Droplets,
  Wind,
  Sun,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  temperature: Thermometer,
  humidity: Droplets,
  co2: Wind,
  par: Sun,
};

interface SensorReadingProps {
  type: "temperature" | "humidity" | "co2" | "par";
  value: number;
  unit: string;
  className?: string;
}

export function SensorReading({ type, value, unit, className }: SensorReadingProps) {
  const Icon = iconMap[type];

  return (
    <div className={cn("flex items-center gap-1.5 text-xs", className)}>
      <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="data-value font-mono text-foreground">
        {typeof value === "number" ? value.toFixed(1) : value}
      </span>
      <span className="text-muted-foreground">{unit}</span>
    </div>
  );
}
