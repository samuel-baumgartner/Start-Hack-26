"use client";

import type { Zone } from "@/lib/types";
import { ZoneCard } from "./ZoneCard";

interface ZoneGridProps {
  zones: Zone[];
}

export function ZoneGrid({ zones }: ZoneGridProps) {
  const nominalCount = zones.filter(
    (z) => !z.is_quarantined && z.crops.every((c) => c.health >= 50),
  ).length;

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Growing Zones
        </h2>
        <span className="text-xs font-mono text-muted-foreground">
          <span className="text-mars-green">{nominalCount}</span>/{zones.length} nominal
        </span>
      </div>

      {/* 3×2 grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {zones.map((zone, i) => (
          <ZoneCard key={zone.zone_id} zone={zone} index={i} />
        ))}
      </div>
    </div>
  );
}
