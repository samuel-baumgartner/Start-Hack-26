import type { HexSlot, HexZone } from "@/data/hexZones";
import { getHoneycombPositions, hexPoints } from "./hexMath";

interface HoneycombTopDownProps {
  zone: HexZone;
  size?: number;
}

function dotColor(slot: HexSlot) {
  if (!slot.crop) return "#8ea397";
  if (slot.crop.health === "stressed") return "#ef4444";
  if (slot.crop.health === "mild-stress") return "#f59e0b";
  return "#22a447";
}

export function HoneycombTopDown({ zone, size = 160 }: HoneycombTopDownProps) {
  const r = size >= 200 ? 34 : 28;
  const positions = getHoneycombPositions(0, 0, r);

  return (
    <svg viewBox="-110 -110 220 220" width={size} height={size * 0.95}>
      {zone.slots.map((slot, i) => {
        const { x: cx, y: cy } = positions[i];
        const isNamed = Boolean(slot.crop);
        const opacity = isNamed ? 0.55 : slot.genericType === "reserve" ? 0.18 : 0.25;
        return (
          <g key={slot.id}>
            <polygon
              points={hexPoints(cx, cy, r)}
              fill={zone.theme.color}
              fillOpacity={opacity}
              stroke={isNamed ? zone.theme.dark : zone.theme.color}
              strokeOpacity={isNamed ? 0.9 : 0.5}
              strokeWidth={isNamed ? 1.2 : 0.8}
              strokeDasharray={slot.genericType === "reserve" ? "3 3" : undefined}
            />
            {slot.crop ? (
              <text
                x={cx}
                y={cy + 2}
                textAnchor="middle"
                fontSize={size >= 200 ? "20" : "15"}
                dominantBaseline="middle"
              >
                {slot.crop.emoji}
              </text>
            ) : null}
            <circle
              cx={cx}
              cy={cy}
              r={slot.crop ? (size >= 200 ? 6.5 : 5) : size >= 200 ? 4 : 3.2}
              fill={dotColor(slot)}
              opacity={slot.crop ? 1 : 0.5}
            />
          </g>
        );
      })}
    </svg>
  );
}
