import type { HexZone } from "@/data/hexZones";
import { hexPoints } from "./hexMath";

interface HoneycombTopDownProps {
  zone: HexZone;
  size?: number;
  motionSeed?: number;
}

function previewPositions(radius: number): Array<{ x: number; y: number }> {
  const pattern = [2, 3, 2, 3, 2] as const;
  const colSpacing = 1.25;
  const rowSpacing = 0.95;
  const colStep = radius * 1.5 * colSpacing;
  const rowStep = Math.sqrt(3) * radius * rowSpacing;
  const centerRow = (pattern.length - 1) / 2;

  return pattern.flatMap((count, rowIndex) => {
    const y = (rowIndex - centerRow) * rowStep;
    const startX = -((count - 1) * colStep) / 2;

    return Array.from({ length: count }, (_, columnIndex) => {
      const x = startX + columnIndex * colStep;
      // Rotate the arrangement 90 degrees while keeping glyph orientation upright.
      return { x: -y, y: x };
    });
  });
}

export function HoneycombTopDown({ zone, size = 160, motionSeed = 0 }: HoneycombTopDownProps) {
  const r = 18;
  const positions = previewPositions(r);
  const includeIllPreview = zone.id === "A";
  const infectedSlotIndex = includeIllPreview ? 6 : -1;

  return (
    <svg viewBox="-90 -90 180 180" width={size} height={size * 0.87}>
      {positions.map((_, i) => {
        const slot = zone.slots[i] ?? { id: `${zone.id}-virtual-${i}`, genericType: "generic" as const };
        const { x: cx, y: cy } = positions[i];
        const uniformOpacity = 0.3;
        const entryDelay = `${150 + motionSeed + i * 40}ms`;
        const showInfectedPreview = i === infectedSlotIndex;
        const hexFill = showInfectedPreview ? "#ef4444" : zone.theme.color;
        const hexStroke = showInfectedPreview ? "#b91c1c" : zone.theme.color;
        return (
          <g
            key={slot.id}
            className={i % 2 === 0 ? "hex-piece-left" : "hex-piece-right"}
            style={{ animationDelay: entryDelay }}
          >
            <polygon
              points={hexPoints(cx, cy, r)}
              fill={hexFill}
              fillOpacity={uniformOpacity}
              stroke={hexStroke}
              strokeOpacity={0.6}
              strokeWidth={0.9}
            />
            <circle cx={cx} cy={cy} r={2.3} fill="#8ea397" opacity={0.55} />
          </g>
        );
      })}
    </svg>
  );
}
