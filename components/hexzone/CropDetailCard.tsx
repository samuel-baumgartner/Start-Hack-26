import type { HexCrop } from "@/data/hexZones";

interface CropDetailCardProps {
  crop: HexCrop;
  isActive?: boolean;
}

function badgeStyles(health: HexCrop["health"]) {
  if (health === "stressed") return "border border-[#F5C1C1] bg-[#FCEBEB] text-[#791F1F]";
  if (health === "mild-stress") return "border border-[#FFE0B2] bg-[#FFF8E1] text-[#E65100]";
  if (health === "rapid-grow") return "border border-[#BCE9DB] bg-[#E1F5EE] text-[#085041]";
  if (health === "harvest-soon") return "border border-[#A8D6AF] bg-[#C8E6C9] text-[#1B5E20]";
  return "border border-[#C8E6C9] bg-[#E8F5E9] text-[#1B5E20]";
}

function healthLabel(health: HexCrop["health"]) {
  if (health === "mild-stress") return "Mild stress";
  if (health === "harvest-soon") return "Harvest soon";
  if (health === "rapid-grow") return "Rapid grow";
  if (health === "stressed") return "Stressed";
  return "Healthy";
}

export function CropDetailCard({ crop, isActive = false }: CropDetailCardProps) {
  return (
    <article
      className={`rounded-xl border bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all ${
        isActive
          ? "border-[#9cd4aa] ring-2 ring-[#d2efda] shadow-[0_8px_20px_rgba(13,84,44,0.14)]"
          : "border-[#E2E8E0]"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xl">{crop.emoji}</span>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${badgeStyles(crop.health)}`}>{healthLabel(crop.health)}</span>
      </div>

      <h4 className="text-[15px] font-medium text-[#1a2b20]">{crop.name}</h4>
      <p className="mt-1 text-[13px] text-[#6b8f6b]">
        Harvest in {crop.harvestSols} sols | Growth: {crop.growthPercent}%
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[13px] text-[#1a2b20]">
        <p>💧 Water: {crop.water}</p>
        <p>≈ Humidity: {crop.humidity}</p>
        <p>☀ Light: {crop.light}</p>
        <p>🧪 Fert: {crop.fertilization}</p>
      </div>

      {crop.note ? <p className="mt-2 text-xs italic text-[#6b8f6b]">{crop.note}</p> : null}
    </article>
  );
}
