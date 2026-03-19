import type { HexSlot, HexZone } from "@/data/hexZones";
import { getHoneycombPositions } from "./hexMath";

interface HoneycombSideViewProps {
  zone: HexZone;
}

interface Point2D {
  x: number;
  y: number;
}

interface PotRenderInfo {
  slot: HexSlot;
  cx: number;
  cy: number;
}

function hexVertices(cx: number, cy: number, radius: number): Point2D[] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}

function pointsString(points: Point2D[]): string {
  return points.map((point) => `${Math.round(point.x * 1000) / 1000},${Math.round(point.y * 1000) / 1000}`).join(" ");
}

function projectedLayout(slots: HexSlot[]): PotRenderInfo[] {
  const base = getHoneycombPositions(0, 0, 44);
  const centerX = 330;
  const centerY = 106;
  const projected = slots.map((slot, i) => ({
    slot,
    cx: centerX + base[i].x * 1.22,
    cy: centerY + base[i].y * 0.62,
  }));
  return projected.sort((a, b) => a.cy - b.cy);
}

export function HoneycombSideView({ zone }: HoneycombSideViewProps) {
  const pots = projectedLayout(zone.slots);
  const radius = 42;
  const depth = 58;
  const visibleFaces = [0, 1, 2];

  return (
    <svg viewBox="0 0 660 280" width="100%" height="100%" aria-label={`${zone.name} perspective view`}>
      {pots.map(({ slot, cx, cy }) => {
        const top = hexVertices(cx, cy, radius);
        const drop = top.map((point) => ({ x: point.x, y: point.y + depth }));
        const isReserve = !slot.crop && slot.genericType === "reserve";
        const topOpacity = slot.crop ? 0.74 : isReserve ? 0.2 : 0.28;

        return (
        <g key={slot.id}>
          <ellipse cx={cx} cy={cy + depth + 10} rx={radius * 0.95} ry={14} fill={zone.theme.dark} opacity={0.15} />
          {visibleFaces.map((index) => {
            const next = (index + 1) % 6;
            const face = [top[index], top[next], drop[next], drop[index]];
            return (
              <polygon
                key={`${slot.id}-face-${index}`}
                points={pointsString(face)}
                fill={zone.theme.color}
                fillOpacity={slot.crop ? 0.5 : isReserve ? 0.16 : 0.22}
                stroke={zone.theme.dark}
                strokeOpacity={0.78}
                strokeWidth="1.05"
                strokeDasharray={isReserve ? "4 3" : undefined}
              />
            );
          })}
          <polygon
            points={pointsString(top)}
            fill={zone.theme.light}
            stroke={zone.theme.dark}
            strokeWidth="1.15"
            fillOpacity={topOpacity}
            strokeOpacity={0.9}
            strokeDasharray={isReserve ? "4 3" : undefined}
          />

        </g>
      );
    })}
    </svg>
  );
}
