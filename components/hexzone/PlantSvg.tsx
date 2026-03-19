import type { HexCrop } from "@/data/hexZones";

interface PlantSvgProps {
  crop: HexCrop;
}

const growthHeight = (value: number) => {
  const clamped = Math.max(10, Math.min(100, value));
  return 20 + ((clamped - 10) / 90) * 35;
};

export function PlantSvg({ crop }: PlantSvgProps) {
  const h = growthHeight(crop.growthPercent);
  const stemColor = "rgba(22, 88, 50, 0.9)";
  const leafColor = "rgba(36, 133, 67, 0.95)";

  switch (crop.id) {
    case "wheat":
      return (
        <g>
          <line x1="0" y1="0" x2="0" y2={-h} stroke={stemColor} strokeWidth="2" />
          <line x1="0" y1={-h + 16} x2="-10" y2={-h + 8} stroke={leafColor} strokeWidth="2" />
          <line x1="0" y1={-h + 24} x2="10" y2={-h + 16} stroke={leafColor} strokeWidth="2" />
          <ellipse cx="0" cy={-h - 3} rx="4" ry="7" fill="#d4b44d" />
        </g>
      );
    case "sweet-potato":
      return (
        <g>
          <line x1="0" y1="0" x2="0" y2={-h * 0.7} stroke={stemColor} strokeWidth="2.4" />
          <path d={`M 0 ${-h * 0.6} C -14 ${-h * 0.72}, -14 ${-h * 0.45}, 0 ${-h * 0.48}`} fill={leafColor} />
          <path d={`M 0 ${-h * 0.58} C 14 ${-h * 0.72}, 14 ${-h * 0.46}, 0 ${-h * 0.49}`} fill={leafColor} />
        </g>
      );
    case "soybean":
      return (
        <g>
          <line x1="0" y1="0" x2="0" y2={-h * 0.82} stroke={stemColor} strokeWidth="2" />
          <ellipse cx="-6" cy={-h * 0.45} rx="3" ry="4" fill="#8fb653" />
          <ellipse cx="6" cy={-h * 0.58} rx="3" ry="4" fill="#8fb653" />
          <ellipse cx="-9" cy={-h * 0.7} rx="5" ry="3" fill={leafColor} />
          <ellipse cx="9" cy={-h * 0.76} rx="5" ry="3" fill={leafColor} />
        </g>
      );
    case "kale":
      return (
        <g>
          <line x1="0" y1="0" x2="0" y2={-h * 0.7} stroke={stemColor} strokeWidth="2" />
          <path d={`M -14 ${-h * 0.35} C -24 ${-h * 0.55}, -8 ${-h * 0.82}, 0 ${-h * 0.62}`} fill={leafColor} />
          <path d={`M 14 ${-h * 0.4} C 26 ${-h * 0.56}, 8 ${-h * 0.84}, 0 ${-h * 0.64}`} fill={leafColor} />
          <path d={`M 0 ${-h * 0.55} C -8 ${-h * 0.86}, 8 ${-h * 0.95}, 0 ${-h * 0.66}`} fill={leafColor} />
        </g>
      );
    case "spinach":
      return (
        <g>
          <line x1="0" y1="0" x2="0" y2={-h * 0.62} stroke={stemColor} strokeWidth="2" />
          <ellipse cx="-8" cy={-h * 0.5} rx="7" ry="10" fill={leafColor} />
          <ellipse cx="8" cy={-h * 0.55} rx="7" ry="10" fill={leafColor} />
          <ellipse cx="0" cy={-h * 0.74} rx="7" ry="10" fill={leafColor} />
        </g>
      );
    case "cherry-tomato":
      return (
        <g>
          <line x1="0" y1="0" x2="0" y2={-h * 0.76} stroke={stemColor} strokeWidth="2" />
          <ellipse cx="-8" cy={-h * 0.64} rx="6" ry="3" fill={leafColor} />
          <ellipse cx="8" cy={-h * 0.7} rx="6" ry="3" fill={leafColor} />
          <circle cx="-6" cy={-h * 0.42} r="4" fill="#c92424" />
          <circle cx="6" cy={-h * 0.5} r="4" fill="#c92424" />
        </g>
      );
    case "radish":
      return (
        <g>
          <line x1="-3" y1="0" x2="-4" y2={-h * 0.66} stroke={stemColor} strokeWidth="2" />
          <line x1="3" y1="0" x2="4" y2={-h * 0.6} stroke={stemColor} strokeWidth="2" />
          <ellipse cx="-7" cy={-h * 0.62} rx="5" ry="9" fill={leafColor} />
          <ellipse cx="8" cy={-h * 0.56} rx="5" ry="9" fill={leafColor} />
          <ellipse cx="0" cy="2" rx="6" ry="4" fill="#d14545" />
        </g>
      );
    case "microgreens":
      return (
        <g>
          {[-9, -4, 0, 4, 9].map((x, i) => (
            <g key={x}>
              <line x1={x} y1="0" x2={x} y2={-h * (0.42 + i * 0.04)} stroke={stemColor} strokeWidth="1.6" />
              <ellipse cx={x - 2} cy={-h * (0.42 + i * 0.04)} rx="2.6" ry="1.7" fill={leafColor} />
              <ellipse cx={x + 2} cy={-h * (0.42 + i * 0.04)} rx="2.6" ry="1.7" fill={leafColor} />
            </g>
          ))}
        </g>
      );
    default:
      return null;
  }
}
