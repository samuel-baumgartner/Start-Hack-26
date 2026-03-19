export interface Point2D {
  x: number;
  y: number;
}

const COORD_PRECISION = 1_000_000;

function normalizeCoord(value: number): number {
  const rounded = Math.round(value * COORD_PRECISION) / COORD_PRECISION;
  return Object.is(rounded, -0) ? 0 : rounded;
}

function formatPoint(x: number, y: number): string {
  return `${normalizeCoord(x)},${normalizeCoord(y)}`;
}

export function hexPoints(cx: number, cy: number, radius: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i;
    return formatPoint(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
  }).join(" ");
}

export function getHoneycombPositions(cx: number, cy: number, radius: number): Point2D[] {
  const d = Math.sqrt(3) * radius;
  const positions: Point2D[] = [{ x: normalizeCoord(cx), y: normalizeCoord(cy) }];
  for (let i = 0; i < 6; i += 1) {
    const angle = Math.PI / 2 + i * (Math.PI / 3);
    positions.push({
      x: normalizeCoord(cx + d * Math.cos(angle)),
      y: normalizeCoord(cy - d * Math.sin(angle)),
    });
  }
  return positions;
}

export function getRowPatternPositions(cx: number, cy: number, radius: number, pattern: readonly number[]): Point2D[] {
  const spacingTightness = 0.995;
  const colStep = Math.sqrt(3) * radius * spacingTightness;
  const rowStep = 1.5 * radius * spacingTightness;
  const centerRow = (pattern.length - 1) / 2;

  return pattern.flatMap((count, rowIndex) => {
    const y = normalizeCoord(cy + (rowIndex - centerRow) * rowStep);
    const startX = cx - ((count - 1) * colStep) / 2;
    return Array.from({ length: count }, (_, columnIndex) => ({
      x: normalizeCoord(startX + columnIndex * colStep),
      y,
    }));
  });
}

export function potSidePoints(cx: number, cy: number, width: number, height: number): string {
  const halfW = width / 2;
  const inset = width * 0.15;
  const topY = cy - height / 2;
  const bottomY = cy + height / 2;
  return [
    formatPoint(cx - halfW + inset, topY),
    formatPoint(cx + halfW - inset, topY),
    formatPoint(cx + halfW, topY + height * 0.15),
    formatPoint(cx + halfW, bottomY),
    formatPoint(cx - halfW, bottomY),
    formatPoint(cx - halfW, topY + height * 0.15),
  ].join(" ");
}

export function potTopFace(cx: number, cy: number, width: number, height: number): string {
  const halfW = width / 2;
  const inset = width * 0.15;
  const topY = cy - height / 2;
  const depth = 8;
  return [
    formatPoint(cx - halfW + inset - 4, topY - depth),
    formatPoint(cx + halfW - inset + 4, topY - depth),
    formatPoint(cx + halfW - inset, topY),
    formatPoint(cx - halfW + inset, topY),
  ].join(" ");
}
