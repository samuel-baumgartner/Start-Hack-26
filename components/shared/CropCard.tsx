import { Droplets, Sun, TestTubeDiagonal, Waves } from "lucide-react";
import type { Crop } from "@/types/greenhouse";
import { fvfmLevel } from "@/utils/statusColors";
import { StatusBadge } from "./StatusBadge";

interface CropCardProps {
  crop: Crop;
}

export function CropCard({ crop }: CropCardProps) {
  const fvfmStatus = fvfmLevel(crop.fvfm);

  return (
    <article className="panel-card rounded-2xl p-5 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="mb-1 text-4xl leading-none">{crop.icon}</p>
          <h4 className="text-lg font-semibold text-[#183226]">{crop.name}</h4>
          <p className="mt-1 text-sm text-[#5f7d69]">
            Harvest in {crop.daysToHarvest} sols | Growth: {crop.growthPercent}%
          </p>
        </div>
        <StatusBadge level={fvfmStatus}>{crop.status}</StatusBadge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm text-[#375645]">
        <p className="flex items-center gap-2">
          <Droplets className="h-[22px] w-[22px] text-[#2a9d8f]" />
          Water: {crop.metrics.water}
        </p>
        <p className="flex items-center gap-2">
          <Waves className="h-[22px] w-[22px] text-[#2e8b57]" />
          Humidity: {crop.metrics.humidity}
        </p>
        <p className="flex items-center gap-2">
          <Sun className="h-[22px] w-[22px] text-amber-500" />
          Light: {crop.metrics.light}
        </p>
        <p className="flex items-center gap-2">
          <TestTubeDiagonal className="h-[22px] w-[22px] text-[#6d5fca]" />
          Fert: {crop.metrics.fertilization}
        </p>
      </div>

      {crop.notes ? <p className="mt-3 text-xs text-[#557363]">{crop.notes}</p> : null}
    </article>
  );
}
