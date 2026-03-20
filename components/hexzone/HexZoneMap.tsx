"use client";

import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { hexZones } from "@/data/hexZones";
import type { HexZone } from "@/data/hexZones";
import { animate } from "./animation";
import { HoneycombTopDown } from "./HoneycombTopDown";
import { HexZoneThreeView } from "./HexZoneThreeView";
import { CropDetailCard } from "./CropDetailCard";

type ViewPhase = "overview" | "detailing" | "detail";
const DETAIL_PLOT_COUNT = 12;
const CALORIC_BASE_DWARF_WHEAT_PLOTS = new Set([0, 2, 5, 7, 8, 10]);
const DETAIL_ENTER_SLOWDOWN = 1.5;
const DISEASE_PLOT_INDEX = 6; // Plot 7 in one-based numbering.

interface PlotSensors {
  moisture: number;
  temperature: number;
  ph: number;
}

function badgeStyles(tone: HexZone["badgeTone"]) {
  if (tone === "red") return "border border-[#F5C1C1] bg-[#FCEBEB] text-[#791F1F]";
  if (tone === "amber") return "border border-[#FFE0B2] bg-[#FFF8E1] text-[#A34E11]";
  return "border border-[#C8E6C9] bg-[#E8F5E9] text-[#1B5E20]";
}

function sensorSnapshot(zoneId: HexZone["id"], plotIndex: number): PlotSensors {
  const zoneSeed = zoneId.charCodeAt(0);
  const phase = plotIndex * 0.7 + zoneSeed * 0.11;
  const moisture = 48 + (zoneSeed % 7) + Math.sin(phase) * 7;
  const temperature = 21 + (zoneSeed % 3) + Math.cos(phase * 0.8) * 1.8;
  const ph = 6.3 + Math.sin(phase * 0.6) * 0.35;

  return {
    moisture: Math.round(moisture * 10) / 10,
    temperature: Math.round(temperature * 10) / 10,
    ph: Math.round(ph * 100) / 100,
  };
}

export function HexZoneMap() {
  const [phase, setPhase] = useState<ViewPhase>("overview");
  const [activeZoneId, setActiveZoneId] = useState<HexZone["id"] | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<HexZone["id"] | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const [cardsOpacity, setCardsOpacity] = useState(1);
  const [cardsScale, setCardsScale] = useState(1);
  const [cameraOrbit, setCameraOrbit] = useState(0);
  const [statsOpacity, setStatsOpacity] = useState(0);
  const [statsTranslateY, setStatsTranslateY] = useState(8);
  const [selectedPlotIndex, setSelectedPlotIndex] = useState<number | null>(null);

  const activeZone = useMemo(
    () => hexZones.find((zone) => zone.id === activeZoneId) ?? null,
    [activeZoneId],
  );
  const detailPlotSlots = useMemo(() => {
    if (!activeZone) return [];
    const activeCrops = activeZone.slots.filter((slot) => slot.crop).map((slot) => slot.crop!);
    const fallbackCrops = hexZones
      .find((zone) => zone.id === "A")
      ?.slots.filter((slot) => slot.crop)
      .map((slot) => slot.crop!) ?? [];

    const primaryCrop = activeCrops[0] ?? fallbackCrops[0];
    const secondaryCrop = activeCrops[1] ?? fallbackCrops[1] ?? primaryCrop;

    if (!primaryCrop || !secondaryCrop) return [];

    if (activeZone.id === "A") {
      const dwarfWheat = activeCrops.find((crop) => crop.id === "wheat") ?? primaryCrop;
      const sweetPotato = activeCrops.find((crop) => crop.id === "sweet-potato") ?? secondaryCrop;

      return Array.from({ length: DETAIL_PLOT_COUNT }, (_, index) => ({
        id: `${activeZone.id}-plot-${index + 1}`,
        crop: CALORIC_BASE_DWARF_WHEAT_PLOTS.has(index) ? dwarfWheat : sweetPotato,
        genericType: "generic" as const,
      }));
    }

    return Array.from({ length: DETAIL_PLOT_COUNT }, (_, index) => ({
      id: `${activeZone.id}-plot-${index + 1}`,
      crop: index < DETAIL_PLOT_COUNT / 2 ? primaryCrop : secondaryCrop,
      genericType: "generic" as const,
    }));
  }, [activeZone]);
  const cropSummaries = useMemo(() => {
    const grouped = new Map<string, { crop: NonNullable<(typeof detailPlotSlots)[number]["crop"]>; plotIndices: number[] }>();
    detailPlotSlots.forEach((slot, index) => {
      if (!slot.crop) return;
      const existing = grouped.get(slot.crop.id);
      if (existing) {
        existing.plotIndices.push(index);
        return;
      }
      grouped.set(slot.crop.id, { crop: slot.crop, plotIndices: [index] });
    });
    return Array.from(grouped.values()).map((entry) => ({
      crop: entry.crop,
      plotIndices: entry.plotIndices,
    }));
  }, [detailPlotSlots]);
  const selectedPlotCrop = useMemo(() => {
    if (selectedPlotIndex === null) return null;
    const slot = detailPlotSlots[selectedPlotIndex];
    return slot?.crop ?? null;
  }, [detailPlotSlots, selectedPlotIndex]);
  const selectedCropId = selectedPlotCrop?.id ?? null;
  const selectedSensors = useMemo(() => {
    if (!activeZone || selectedPlotIndex === null) return null;
    return sensorSnapshot(activeZone.id, selectedPlotIndex);
  }, [activeZone, selectedPlotIndex]);
  const selectedPlotHasDisease = selectedPlotIndex === DISEASE_PLOT_INDEX;

  async function enterZoneDetail(zoneId: HexZone["id"]) {
    if (isAnimating) return;
    const zone = hexZones.find((z) => z.id === zoneId);
    if (!zone) return;

    setIsAnimating(true);
    setActiveZoneId(zoneId);
    setPhase("detailing");
    setCameraOrbit(0);
    setStatsOpacity(0);
    setStatsTranslateY(8);
    setSelectedPlotIndex(null);

    await animate(300 * DETAIL_ENTER_SLOWDOWN, (p) => {
      setCardsOpacity(1 - p);
      setCardsScale(1 - p * 0.04);
    });

    await animate(750 * DETAIL_ENTER_SLOWDOWN, (p) => setCameraOrbit(p));

    await animate(300 * DETAIL_ENTER_SLOWDOWN, (p) => {
      setStatsOpacity(p);
      setStatsTranslateY(8 * (1 - p));
    });

    setPhase("detail");
    setIsAnimating(false);
  }

  async function returnToOverview() {
    if (!activeZone || isAnimating) return;
    setIsAnimating(true);

    await animate(200, (p) => {
      setStatsOpacity(1 - p);
      setStatsTranslateY(8 * p);
    });

    await animate(750, (p) => setCameraOrbit(1 - p));

    setPhase("overview");
    setActiveZoneId(null);
    setSelectedPlotIndex(null);

    await animate(300, (p) => {
      setCardsOpacity(p);
      setCardsScale(0.96 + p * 0.04);
    });

    setIsAnimating(false);
  }

  return (
    <section className="panel-card flex h-full min-h-[520px] flex-col rounded-3xl p-6">
      <h2 className="mb-3 text-xl font-semibold uppercase tracking-wide text-[#496856]">Zone Map</h2>
      <p className="mb-4 text-base text-[#607f6b]">Click any zone to inspect crops and sensor details.</p>

      {phase === "overview" ? (
        <div
          style={{
            opacity: cardsOpacity,
            transform: `scale(${cardsScale})`,
          }}
          className="grid w-full grid-cols-2 gap-4"
        >
          {hexZones.map((zone) => {
            const isHovered = hoveredZoneId === zone.id;
            return (
              <button
                key={zone.id}
                type="button"
                onClick={() => void enterZoneDetail(zone.id)}
                onMouseEnter={() => setHoveredZoneId(zone.id)}
                onMouseLeave={() => setHoveredZoneId(null)}
                className="rounded-2xl border border-[#E2E8E0] bg-white px-5 pb-4 pt-4 text-left shadow-[0_5px_20px_rgba(21,50,33,0.05)] transition-shadow"
                style={{
                  cursor: "pointer",
                  borderColor: isHovered ? "#B9D4C1" : "#E2E8E0",
                  transform: isHovered ? "translateY(-2px)" : "translateY(0px)",
                  boxShadow: isHovered
                    ? "0 12px 28px rgba(20, 59, 38, 0.08)"
                    : "0 5px 20px rgba(21, 50, 33, 0.05)",
                }}
              >
                <div className="mb-3 rounded-xl border border-[#E2EDE4] bg-gradient-to-b from-[#f8fcf8] to-[#f2f7f2] p-2.5">
                  <div className="flex min-h-[132px] items-center justify-center">
                    <HoneycombTopDown zone={zone} size={286} />
                  </div>
                </div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-[17px] font-semibold text-[#1a2b20]">{zone.name}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeStyles(zone.badgeTone)}`}>
                    {zone.badgeLabel}
                  </span>
                </div>
                <p className="text-sm text-[#6b8f6b]">{zone.subtitle}</p>
              </button>
            );
          })}
        </div>
      ) : activeZone ? (
        <div className="flex flex-1 flex-col">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => void returnToOverview()}
              disabled={isAnimating}
              className="inline-flex items-center gap-2 rounded-full border border-[#d4e5d7] bg-white px-4 py-2 text-sm text-[#335140]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="text-right">
              <p className="text-base font-medium text-[#1a2b20]">
                {activeZone.name} - {activeZone.subtitle}
              </p>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeStyles(activeZone.badgeTone)}`}>
                {activeZone.badgeLabel}
              </span>
            </div>
          </div>

          <div className="relative mb-4 min-h-[340px] flex-1 rounded-2xl border border-[#dce9de] bg-gradient-to-b from-white/85 to-[#f0f5f0] p-2">
            <div className="absolute inset-0">
              <HexZoneThreeView
                zone={activeZone}
                plotSlots={detailPlotSlots}
                orbitProgress={cameraOrbit}
                selectedPlotIndex={selectedPlotIndex}
                onSelectPlot={(plotIndex) => {
                  if (plotIndex === selectedPlotIndex) return;
                  setSelectedPlotIndex(plotIndex);
                }}
              />
            </div>
            <article
              style={{ opacity: statsOpacity, transform: `translateY(${statsTranslateY}px)` }}
              className="pointer-events-none absolute left-5 top-5 z-10 w-[230px] rounded-xl border border-[#d7e7db] bg-white/96 p-3 shadow-[0_10px_24px_rgba(16,52,34,0.12)] backdrop-blur-[2px] transition-all duration-200"
            >
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-[#4e6a58]">Selected Plot</h4>
                <span className="rounded-full border border-[#cfe5d4] bg-[#edf8ef] px-2 py-1 text-[11px] text-[#356048]">
                  {selectedPlotIndex === null ? "None" : `Plot ${selectedPlotIndex + 1}/${DETAIL_PLOT_COUNT}`}
                </span>
              </div>
              {selectedPlotCrop ? (
                <p className="mb-1.5 text-[11px] font-medium text-[#3a6a4a]">
                  {selectedPlotCrop.emoji} {selectedPlotCrop.name}
                </p>
              ) : null}
              {selectedPlotHasDisease ? (
                <p className="mb-1.5 rounded-md border border-[#f5c2c7] bg-[#fdecec] px-2.5 py-1.5 text-[11px] font-medium text-[#8a1c1c]">
                  Disease alert: this plant shows signs of infection.
                </p>
              ) : null}
              {selectedSensors ? (
                <div className="grid grid-cols-1 gap-1.5 text-xs text-[#1f3729]">
                  <p className="rounded-md bg-[#f5faf6] px-2.5 py-1.5 transition-colors">
                    💧 Moisture: {selectedSensors.moisture}%
                  </p>
                  <p className="rounded-md bg-[#f5faf6] px-2.5 py-1.5 transition-colors">
                    🌡 Temperature: {selectedSensors.temperature} C
                  </p>
                  <p className="rounded-md bg-[#f5faf6] px-2.5 py-1.5 transition-colors">
                    🧪 pH: {selectedSensors.ph}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#6b8f6b]">Click a hex pot to inspect live sensor values.</p>
              )}
            </article>
          </div>

          <div
            style={{ opacity: statsOpacity, transform: `translateY(${statsTranslateY}px)` }}
            className="grid grid-cols-1 gap-3 lg:grid-cols-2"
          >
            {cropSummaries.map(({ crop }) => (
              <CropDetailCard
                key={crop.id}
                crop={crop}
                isActive={selectedCropId === crop.id}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
