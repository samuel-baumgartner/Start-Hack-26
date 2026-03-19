"use client";

import { ArrowLeft } from "lucide-react";
import { CropCard } from "@/components/shared/CropCard";
import type { Zone } from "@/types/greenhouse";

interface ZoneDetailProps {
  zone: Zone;
  onBack: () => void;
}

export function ZoneDetail({ zone, onBack }: ZoneDetailProps) {
  return (
    <section className="panel-card fade-in h-full min-h-[520px] rounded-3xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <button
          className="inline-flex items-center gap-2 rounded-full border border-[#d4e5d7] bg-white px-4 py-2 text-base text-[#335140] hover:border-[#36398e] hover:text-[#36398e]"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
        <p className="text-sm text-[#66816f]">{zone.cropSummary}</p>
      </div>

      <h2 className="mb-5 text-3xl font-semibold text-[#1d372b]">
        {zone.name} - {zone.category}
      </h2>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
        {zone.crops.map((crop) => (
          <CropCard key={crop.id} crop={crop} />
        ))}
      </div>
    </section>
  );
}
