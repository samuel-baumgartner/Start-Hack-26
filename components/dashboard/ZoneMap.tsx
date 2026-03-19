"use client";

import { useMemo, useState } from "react";
import type { Zone } from "@/types/greenhouse";

interface ZoneMapProps {
  zones: Zone[];
  onSelectZone: (zoneId: Zone["id"]) => void;
}

function healthDot(health: Zone["health"]) {
  if (health === "critical") return "#ef4444";
  if (health === "warning") return "#f59e0b";
  return "#009f3c";
}

export function ZoneMap({ zones, onSelectZone }: ZoneMapProps) {
  const [hovered, setHovered] = useState<Zone["id"] | null>(null);

  const layeredZones = useMemo(
    () => [...zones].sort((a, b) => (a.id < b.id ? -1 : 1)),
    [zones],
  );

  return (
    <section className="panel-card flex h-full min-h-[520px] flex-col rounded-3xl p-6">
      <h2 className="mb-3 text-xl font-semibold uppercase tracking-wide text-[#496856]">Zone Map</h2>
      <p className="mb-4 text-base text-[#607f6b]">Click any zone to inspect crops and sensor details.</p>

      <div className="relative flex-1 rounded-2xl border border-[#dce9de] bg-gradient-to-b from-[#f5fbf6] to-white p-4">
        <svg viewBox="0 0 520 360" className="h-[430px] w-full">
          {layeredZones.map((zone, index) => {
            const yOffset = 40 + index * 62;
            const hoveredNow = hovered === zone.id;
            const points = `110,${yOffset} 396,${yOffset} 442,${yOffset + 54} 154,${yOffset + 54}`;

            return (
              <g
                key={zone.id}
                onMouseEnter={() => setHovered(zone.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelectZone(zone.id)}
                className="cursor-pointer transition-opacity"
              >
                <polygon
                  points={points}
                  fill={zone.fill}
                  stroke={zone.border}
                  strokeWidth={hoveredNow ? 3 : 2}
                  opacity={hoveredNow ? 1 : 0.88}
                />

                <line
                  x1={130}
                  y1={yOffset + 14}
                  x2={410}
                  y2={yOffset + 14}
                  stroke="rgba(35,72,49,0.22)"
                  strokeDasharray="3 5"
                />
                <line
                  x1={141}
                  y1={yOffset + 29}
                  x2={421}
                  y2={yOffset + 29}
                  stroke="rgba(35,72,49,0.22)"
                  strokeDasharray="3 5"
                />
                <line
                  x1={152}
                  y1={yOffset + 43}
                  x2={432}
                  y2={yOffset + 43}
                  stroke="rgba(35,72,49,0.22)"
                  strokeDasharray="3 5"
                />

                <text x={172} y={yOffset + 33} fill="#1e3b2f" fontSize="18" fontWeight="600">
                  {zone.name} - {zone.category}
                </text>
                <circle cx={408} cy={yOffset + 28} r={10} fill={healthDot(zone.health)} />
              </g>
            );
          })}
        </svg>

        {hovered ? (
          <div className="absolute right-4 top-4 rounded-xl bg-[#36398e] px-4 py-2.5 text-sm text-white shadow-lg">
            {zones.find((zone) => zone.id === hovered)?.name} selected
          </div>
        ) : null}
      </div>
    </section>
  );
}
