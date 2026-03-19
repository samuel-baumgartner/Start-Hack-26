"use client";

import { motion } from "framer-motion";
import { Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Zone } from "@/lib/types";
import { CropBadge } from "./CropBadge";
import { SensorReading } from "../shared/SensorReading";
import { StatusBadge } from "../shared/StatusBadge";

interface ZoneCardProps {
  zone: Zone;
  index: number;
}

function getZoneStatus(zone: Zone): "nominal" | "warning" | "critical" {
  const minHealth = zone.crops.reduce((min, c) => Math.min(min, c.health), 100);
  if (minHealth < 25 || zone.is_quarantined || zone.priority === "sacrifice") return "critical";
  if (minHealth < 50 || zone.priority === "hibernate") return "warning";
  return "nominal";
}

const priorityLabels: Record<string, string> = {
  high: "HIGH",
  low: "LOW",
  hibernate: "HIB",
  sacrifice: "SAC",
};

export function ZoneCard({ zone, index }: ZoneCardProps) {
  const status = getZoneStatus(zone);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      whileHover={{ scale: 1.01 }}
      className={cn(
        "rounded-lg border bg-card p-3 transition-colors",
        status === "nominal" && "zone-border-green",
        status === "warning" && "zone-border-yellow",
        status === "critical" && "zone-border-red",
      )}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold font-mono text-foreground">
            {zone.zone_id}
          </span>
          {zone.is_quarantined && (
            <Shield className="h-3.5 w-3.5 text-mars-red" />
          )}
          {zone.priority !== "normal" && priorityLabels[zone.priority] && (
            <StatusBadge
              status={zone.priority === "high" ? "warning" : "critical"}
            >
              {priorityLabels[zone.priority]}
            </StatusBadge>
          )}
        </div>
        {status === "critical" && (
          <AlertTriangle className="h-3.5 w-3.5 text-mars-red animate-alert-pulse" />
        )}
      </div>

      {/* Crops */}
      <div className="flex flex-wrap gap-1 mb-2.5">
        {zone.crops.map((crop) => (
          <CropBadge key={crop.name} crop={crop} />
        ))}
      </div>

      {/* Sensors row */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        <SensorReading type="temperature" value={zone.temperature} unit="°C" />
        <SensorReading type="humidity" value={zone.humidity} unit="%" />
        <SensorReading type="co2" value={zone.co2_ppm} unit="ppm" />
        <SensorReading type="par" value={zone.par_level} unit="μmol" />
      </div>
    </motion.div>
  );
}
