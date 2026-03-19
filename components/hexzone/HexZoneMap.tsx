"use client";

import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { hexZones } from "@/data/hexZones";
import type { HexZone } from "@/data/hexZones";
import { animate, delay } from "./animation";
import { HoneycombTopDown } from "./HoneycombTopDown";
import { HoneycombSideView } from "./HoneycombSideView";
import { CropDetailCard } from "./CropDetailCard";

type ViewPhase = "overview" | "detailing" | "detail";

function badgeStyles(tone: HexZone["badgeTone"]) {
  if (tone === "red") return "border border-[#F5C1C1] bg-[#FCEBEB] text-[#791F1F]";
  if (tone === "amber") return "border border-[#FFE0B2] bg-[#FFF8E1] text-[#A34E11]";
  return "border border-[#C8E6C9] bg-[#E8F5E9] text-[#1B5E20]";
}

export function HexZoneMap() {
  const [phase, setPhase] = useState<ViewPhase>("overview");
  const [activeZoneId, setActiveZoneId] = useState<HexZone["id"] | null>(null);
  const [hoveredZoneId, setHoveredZoneId] = useState<HexZone["id"] | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const [cardsOpacity, setCardsOpacity] = useState(1);
  const [cardsScale, setCardsScale] = useState(1);
  const [topDownOpacity, setTopDownOpacity] = useState(1);
  const [sideViewOpacity, setSideViewOpacity] = useState(0);
  const [tiltAngle, setTiltAngle] = useState(0);
  const [statsOpacity, setStatsOpacity] = useState(0);
  const [statsTranslateY, setStatsTranslateY] = useState(8);
  const [plantProgress, setPlantProgress] = useState<Record<string, number>>({});

  const activeZone = useMemo(
    () => hexZones.find((zone) => zone.id === activeZoneId) ?? null,
    [activeZoneId],
  );

  async function enterZoneDetail(zoneId: HexZone["id"]) {
    if (isAnimating) return;
    const zone = hexZones.find((z) => z.id === zoneId);
    if (!zone) return;

    setIsAnimating(true);
    setActiveZoneId(zoneId);
    setPhase("detailing");
    setTopDownOpacity(1);
    setSideViewOpacity(0);
    setTiltAngle(0);
    setStatsOpacity(0);
    setStatsTranslateY(8);
    setPlantProgress({});

    await animate(300, (p) => {
      setCardsOpacity(1 - p);
      setCardsScale(1 - p * 0.04);
    });

    await animate(500, (p) => {
      setTopDownOpacity(1 - p);
      setSideViewOpacity(p);
      setTiltAngle(p * 50);
    });

    const namedSlotIds = zone.slots.filter((slot) => slot.crop).map((slot) => slot.id);
    namedSlotIds.forEach((slotId, index) => {
      window.setTimeout(() => {
        void animate(400, (p) => {
          setPlantProgress((prev) => ({ ...prev, [slotId]: p }));
        });
      }, index * 150);
    });
    await delay(namedSlotIds.length * 150 + 400);

    await animate(300, (p) => {
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

    const namedSlotIds = activeZone.slots.filter((slot) => slot.crop).map((slot) => slot.id);
    await animate(200, (p) => {
      const nextProgress = 1 - p;
      setPlantProgress((prev) => {
        const copy = { ...prev };
        namedSlotIds.forEach((id) => {
          copy[id] = nextProgress;
        });
        return copy;
      });
    });

    await animate(400, (p) => {
      setSideViewOpacity(1 - p);
      setTopDownOpacity(p);
      setTiltAngle(50 * (1 - p));
    });

    setPhase("overview");
    setActiveZoneId(null);

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
          className="mx-auto grid w-full max-w-[720px] grid-cols-2 gap-4"
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
                className="rounded-xl border border-[#E2E8E0] bg-white px-6 pb-5 pt-8 text-left"
                style={{
                  cursor: "pointer",
                  borderColor: isHovered ? "#C5CCC3" : "#E2E8E0",
                  transform: isHovered ? "translateY(-2px)" : "translateY(0px)",
                }}
              >
                <div className="mb-3 flex justify-center">
                  <HoneycombTopDown zone={zone} size={152} />
                </div>
                <div className="mb-1 flex items-center justify-between">
                  <h3 className="text-[15px] font-medium text-[#1a2b20]">{zone.name}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${badgeStyles(zone.badgeTone)}`}>
                    {zone.badgeLabel}
                  </span>
                </div>
                <p className="text-[13px] text-[#6b8f6b]">{zone.subtitle}</p>
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

          <div className="relative mb-4 min-h-[230px] flex-1 rounded-2xl border border-[#dce9de] bg-white/70 p-4">
            <div
              style={{
                opacity: topDownOpacity,
                transform: `perspective(700px) rotateX(${tiltAngle}deg)`,
                transformOrigin: "center center",
              }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <HoneycombTopDown zone={activeZone} size={210} />
            </div>
            <div style={{ opacity: sideViewOpacity }} className="absolute inset-0 p-4">
              <HoneycombSideView zone={activeZone} plantProgress={plantProgress} />
            </div>
          </div>

          <div
            style={{ opacity: statsOpacity, transform: `translateY(${statsTranslateY}px)` }}
            className="grid grid-cols-1 gap-3 lg:grid-cols-3"
          >
            {activeZone.slots.filter((slot) => slot.crop).map((slot) => <CropDetailCard key={slot.id} crop={slot.crop!} />)}
          </div>
        </div>
      ) : null}
    </section>
  );
}
