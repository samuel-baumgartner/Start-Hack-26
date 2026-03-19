"use client";

type ZoneId = "A" | "B" | "C" | "D";

export interface IsoZone {
  id: ZoneId;
  title: string;
  subtitle: string;
  healthPct: number;
  status: "healthy" | "warning" | "critical";
}

interface IsometricGreenhouseProps {
  zones: IsoZone[];
  activeZoneId?: ZoneId;
  onZoneClick: (zoneId: ZoneId) => void;
}

const zonePolygons: Record<ZoneId, string> = {
  A: "120,330 480,230 560,275 200,375",
  B: "250,215 600,125 680,170 330,260",
  C: "405,365 760,270 845,315 490,410",
  D: "535,250 890,155 965,200 615,295",
};

const statusClass: Record<IsoZone["status"], string> = {
  healthy: "fill-[#019934]/20 stroke-[#019934]",
  warning: "fill-[#F0AB00]/25 stroke-[#C08400]",
  critical: "fill-[#E03C31]/25 stroke-[#B4231A]",
};

export default function IsometricGreenhouse({
  zones,
  activeZoneId,
  onZoneClick,
}: IsometricGreenhouseProps) {
  const activeLabel = activeZoneId ? `Zone ${activeZoneId}` : "None";

  return (
    <div className="relative overflow-hidden rounded-3xl border border-[#dbe6df] bg-gradient-to-br from-[#f7faf8] to-[#e8f1ec]">
      <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-full border border-[#d6e2dc] bg-white/90 px-3 py-1 text-xs font-semibold text-[#2b3a33]">
        Active zone: <span className="text-[#019934]">{activeLabel}</span>
      </div>
      <svg viewBox="0 0 1000 520" className="h-auto w-full">
        <defs>
          <linearGradient id="floorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e4ede7" />
            <stop offset="100%" stopColor="#d8e6de" />
          </linearGradient>
          <pattern id="soilPattern" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.2" fill="#93a29a" opacity="0.15" />
            <circle cx="11" cy="9" r="0.8" fill="#93a29a" opacity="0.15" />
          </pattern>
        </defs>

        <polygon
          points="70,390 720,210 930,325 275,505"
          fill="url(#floorGradient)"
          stroke="#c6d6cd"
          strokeWidth="2"
        />
        <polygon
          points="70,390 720,210 930,325 275,505"
          fill="url(#soilPattern)"
          opacity="0.5"
        />

        {zones.map((zone) => {
          const active = activeZoneId === zone.id;
          return (
            <g key={zone.id}>
              <polygon
                points={zonePolygons[zone.id]}
                className={`cursor-pointer stroke-[2] transition-all duration-200 ${
                  statusClass[zone.status]
                } ${active ? "opacity-100" : "opacity-75 hover:opacity-95"}`}
                onClick={() => onZoneClick(zone.id)}
              />

              <foreignObject
                x={zone.id === "A" ? 145 : zone.id === "B" ? 275 : zone.id === "C" ? 430 : 560}
                y={zone.id === "A" ? 275 : zone.id === "B" ? 165 : zone.id === "C" ? 310 : 195}
                width="168"
                height="84"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onZoneClick(zone.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onZoneClick(zone.id);
                    }
                  }}
                  className={`cursor-pointer rounded-2xl border border-white/90 bg-white/88 p-3 shadow-sm backdrop-blur-sm transition ${
                    active ? "ring-2 ring-[#019934]/40" : "hover:bg-white"
                  }`}
                >
                  <p className="text-2xl font-semibold leading-none text-[#1f2a24]">
                    Zone {zone.id}
                  </p>
                  <p className="mt-1 text-xs text-[#5a6a63]">{zone.subtitle}</p>
                  <p className="mt-2 text-xs font-medium text-[#019934]">{zone.healthPct}%</p>
                </div>
              </foreignObject>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
