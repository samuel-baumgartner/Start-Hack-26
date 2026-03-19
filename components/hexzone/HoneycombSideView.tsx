import type { HexSlot, HexZone } from "@/data/hexZones";
import { sideViewOrder } from "@/data/hexZones";
import { PlantSvg } from "./PlantSvg";
import { potSidePoints, potTopFace } from "./hexMath";

interface HoneycombSideViewProps {
  zone: HexZone;
  plantProgress: Record<string, number>;
}

interface PotRenderInfo {
  slot: HexSlot;
  cx: number;
  cy: number;
  width: number;
  height: number;
  isBackRow: boolean;
}

function sideLayout(slots: HexSlot[]): PotRenderInfo[] {
  const width = 112;
  const height = 76;
  const spacing = width * 0.92;
  const backY = 58;
  const frontY = 108;
  const centerX = 350;

  const backStart = centerX - spacing;
  const frontStart = centerX - spacing * 1.5;

  const back = sideViewOrder.backRow.map((slotIndex, idx) => ({
    slot: slots[slotIndex],
    cx: backStart + idx * spacing,
    cy: backY,
    width,
    height,
    isBackRow: true,
  }));

  const front = sideViewOrder.frontRow.map((slotIndex, idx) => ({
    slot: slots[slotIndex],
    cx: frontStart + idx * spacing,
    cy: frontY,
    width,
    height,
    isBackRow: false,
  }));

  return [...back, ...front];
}

export function HoneycombSideView({ zone, plantProgress }: HoneycombSideViewProps) {
  const pots = sideLayout(zone.slots);

  return (
    <svg viewBox="0 0 700 220" width="100%" height="220" aria-label={`${zone.name} side view`}>
      {pots.map(({ slot, cx, cy, width, height, isBackRow }) => (
        <g key={slot.id} opacity={isBackRow ? 0.88 : 1}>
          <polygon
            points={potTopFace(cx, cy, width, height)}
            fill={zone.theme.light}
            stroke={zone.theme.dark}
            strokeWidth="1"
            opacity={0.95}
          />
          <polygon
            points={potSidePoints(cx, cy, width, height)}
            fill={zone.theme.color}
            fillOpacity={slot.crop ? 0.45 : 0.26}
            stroke={zone.theme.dark}
            strokeWidth="1.2"
            strokeDasharray={!slot.crop && slot.genericType === "reserve" ? "4 3" : undefined}
          />

          {slot.crop ? (
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize="20">
              {slot.crop.emoji}
            </text>
          ) : null}

          {slot.crop ? (
            <g
              transform={`translate(${cx}, ${cy - height / 2}) scale(1, ${Math.max(0, plantProgress[slot.id] ?? 0)})`}
              opacity={Math.max(0, plantProgress[slot.id] ?? 0)}
            >
              <PlantSvg crop={slot.crop} />
            </g>
          ) : null}
        </g>
      ))}
    </svg>
  );
}
