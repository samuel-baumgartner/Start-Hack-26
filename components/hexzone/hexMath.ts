export interface Point2D {
  x: number;
  y: number;
}

export function hexPoints(cx: number, cy: number, radius: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i;
    return `${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`;
  }).join(" ");
}

export function getHoneycombPositions(cx: number, cy: number, radius: number): Point2D[] {
  const d = Math.sqrt(3) * radius;
  const positions: Point2D[] = [{ x: cx, y: cy }];
  for (let i = 0; i < 6; i += 1) {
    const angle = Math.PI / 2 + i * (Math.PI / 3);
    positions.push({
      x: cx + d * Math.cos(angle),
      y: cy - d * Math.sin(angle),
    });
  }
  return positions;
}

export function potSidePoints(cx: number, cy: number, width: number, height: number): string {
  const halfW = width / 2;
  const inset = width * 0.15;
  const topY = cy - height / 2;
  const bottomY = cy + height / 2;
  return [
    `${cx - halfW + inset},${topY}`,
    `${cx + halfW - inset},${topY}`,
    `${cx + halfW},${topY + height * 0.15}`,
    `${cx + halfW},${bottomY}`,
    `${cx - halfW},${bottomY}`,
    `${cx - halfW},${topY + height * 0.15}`,
  ].join(" ");
}

export function potTopFace(cx: number, cy: number, width: number, height: number): string {
  const halfW = width / 2;
  const inset = width * 0.15;
  const topY = cy - height / 2;
  const depth = 8;
  return [
    `${cx - halfW + inset - 4},${topY - depth}`,
    `${cx + halfW - inset + 4},${topY - depth}`,
    `${cx + halfW - inset},${topY}`,
    `${cx - halfW + inset},${topY}`,
  ].join(" ");
}
