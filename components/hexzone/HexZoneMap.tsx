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
    <section className="panel-card relative flex min-h-[min(100vw,420px)] flex-col overflow-hidden rounded-2xl border border-[#dce8dd] bg-[radial-gradient(circle_at_top_left,_rgba(231,245,236,0.6),_rgba(255,255,255,0.95)_35%,_rgba(250,253,251,0.95)_100%)] p-4 shadow-[0_16px_50px_rgba(20,55,36,0.08)] sm:min-h-[520px] sm:rounded-3xl sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#dff2e2] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-[#e6f4ea] blur-3xl" />

      <div className="assemble-drop-up relative mb-6 flex flex-col items-center text-center" style={{ animationDelay: "210ms" }}>
        <span className="mb-3 rounded-full border border-[#cfe1d2] bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4b6d59] shadow-[0_4px_14px_rgba(23,64,42,0.08)]">
          Greenhouse Intelligence
        </span>
        <h2 className="text-xl font-semibold uppercase tracking-[0.18em] text-[#2f4e3e] sm:text-2xl">Zone Map</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#5f7e6a] sm:mt-3 sm:text-base">
          Click any zone to inspect crops and sensor details.
        </p>
        <div className="mt-4 h-px w-24 bg-gradient-to-r from-transparent via-[#aac8b3] to-transparent" />
      </div>

      {phase === "overview" ? (
        <div
          style={{
            opacity: cardsOpacity,
            transform: `scale(${cardsScale})`,
          }}
          className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5"
        >
          {hexZones.map((zone, zoneIndex) => {
            const isHovered = hoveredZoneId === zone.id;
            return (
              <div
                key={zone.id}
                className={zoneIndex % 2 === 0 ? "assemble-fly-left" : "assemble-fly-right"}
                style={{ animationDelay: `${320 + zoneIndex * 90}ms` }}
              >
                <button
                  type="button"
                  onClick={() => void enterZoneDetail(zone.id)}
                  onMouseEnter={() => setHoveredZoneId(zone.id)}
                  onMouseLeave={() => setHoveredZoneId(null)}
                  className="w-full rounded-2xl border border-[#dfe9e1] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(247,252,248,0.95))] px-3 pb-3 pt-3 text-left shadow-[0_10px_24px_rgba(24,56,37,0.06)] ring-1 ring-white/80 transition-all duration-200 sm:px-5 sm:pb-4 sm:pt-4"
                  style={{
                    cursor: "pointer",
                    borderColor: isHovered ? "#b7d7c1" : "#dfe9e1",
                    transform: isHovered ? "translateY(-4px) scale(1.01)" : "translateY(0px) scale(1)",
                    boxShadow: isHovered
                      ? "0 18px 38px rgba(18, 60, 37, 0.12)"
                      : "0 10px 24px rgba(24, 56, 37, 0.06)",
                  }}
                >
                  <div className="mb-2 rounded-xl border border-[#ddeade] bg-gradient-to-b from-[#f8fcf8] via-[#f4faf5] to-[#eef5ef] p-2 shadow-inner shadow-[#ecf5ee] sm:mb-3 sm:p-2.5">
                    <div className="flex min-h-[124px] items-center justify-center overflow-hidden sm:min-h-[132px]">
                      <div className="origin-center scale-[0.76] sm:scale-[0.92] md:scale-100">
                        <HoneycombTopDown zone={zone} size={286} motionSeed={zoneIndex * 12} />
                      </div>
                    </div>
                  </div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 gap-y-1">
                    <h3 className="text-[15px] font-semibold text-[#1a2b20] sm:text-[17px]">{zone.name}</h3>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeStyles(zone.badgeTone)}`}>
                      {zone.badgeLabel}
                    </span>
                  </div>
                  <p className="text-sm text-[#6b8f6b]">{zone.subtitle}</p>
                </button>
                </div>
            );
          })}
        </div>
      ) : activeZone ? (
        <div className="flex flex-1 flex-col">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => void returnToOverview()}
              disabled={isAnimating}
              className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d4e5d7] bg-white px-4 py-2 text-sm text-[#335140]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="min-w-0 text-left sm:text-right">
              <p className="text-sm font-medium text-[#1a2b20] sm:text-base">
                {activeZone.name} - {activeZone.subtitle}
              </p>
              <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-medium ${badgeStyles(activeZone.badgeTone)}`}>
                {activeZone.badgeLabel}
              </span>
            </div>
          </div>

          <div className="mb-4 flex min-h-0 flex-col gap-3 sm:relative sm:min-h-[380px]">
            <div className="relative isolate min-h-[min(46dvh,420px)] w-full shrink-0 overflow-hidden rounded-2xl border border-[#dce9de] bg-gradient-to-b from-white/85 to-[#f0f5f0] sm:absolute sm:inset-0 sm:min-h-0">
              <div className="absolute inset-0 [&_canvas]:touch-pan-y">
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
            </div>
            <article
              style={{ opacity: statsOpacity, transform: `translateY(${statsTranslateY}px)` }}
              className="relative z-10 w-full rounded-xl border border-[#d7e7db] bg-white/98 p-3 shadow-[0_10px_24px_rgba(16,52,34,0.1)] transition-all duration-200 sm:pointer-events-none sm:absolute sm:left-4 sm:top-4 sm:w-[min(230px,calc(100%-2rem))] sm:max-w-[230px] sm:bg-white/96 sm:p-3 sm:backdrop-blur-[2px]"
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
                <div className="disease-alert-clean mb-1.5 rounded-lg border px-3 py-2 text-[11px]">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#9f1239]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#e11d48]" />
                      Active Infection
                    </span>
                  </div>
                  <p className="font-medium text-[#7f1d1d]">Disease alert: this plant shows signs of infection.</p>
                </div>
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
