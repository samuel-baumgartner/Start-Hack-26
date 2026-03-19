"use client";

import { cn } from "@/lib/utils";
import type { CropStatus } from "@/lib/types";

interface CropBadgeProps {
  crop: CropStatus;
}

export function CropBadge({ crop }: CropBadgeProps) {
  const healthColor =
    crop.health >= 75 ? "bg-mars-green/15 text-mars-green border-mars-green/20"
    : crop.health >= 50 ? "bg-mars-yellow/15 text-mars-yellow border-mars-yellow/20"
    : "bg-mars-red/15 text-mars-red border-mars-red/20";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-mono",
        healthColor,
      )}
    >
      <span className="font-medium">{crop.name}</span>
      <span className="text-muted-foreground">{crop.growth_stage.slice(0, 3)}</span>
      <div className="w-8 h-1 rounded-full bg-white/10 overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            crop.health >= 75 ? "bg-mars-green" : crop.health >= 50 ? "bg-mars-yellow" : "bg-mars-red",
          )}
          style={{ width: `${crop.health}%` }}
        />
      </div>
    </div>
  );
}
