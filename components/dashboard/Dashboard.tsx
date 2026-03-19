"use client";

import { useMemo, useState } from "react";
import { useGreenhouse } from "@/hooks/use-greenhouse";
import { useNutrition } from "@/hooks/use-nutrition";
import { useAgentChat } from "@/hooks/use-agent-chat";
import { useAutoTick } from "@/hooks/use-auto-tick";
import IsometricGreenhouse, { type IsoZone } from "./IsometricGreenhouse";
import { Loader2, X } from "lucide-react";
import type { CropStatus, Zone } from "@/lib/types";

type CategoryId = "A" | "B" | "C" | "D";

interface PlantSlide {
  id: string;
  name: string;
  sourceZone: string;
  growthStage: string;
  health: number;
  daysToHarvest: number;
  biomass: number;
}

interface ZoneCategory {
  id: CategoryId;
  title: string;
  subtitle: string;
  status: IsoZone["status"];
  healthPct: number;
  plants: PlantSlide[];
}

const categoryImage: Record<CategoryId, string> = {
  A: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=1400&q=80",
  B: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=1400&q=80",
  C: "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&w=1400&q=80",
  D: "https://images.unsplash.com/photo-1592417817038-d13fd7342605?auto=format&fit=crop&w=1400&q=80",
};

const detailLeafImage =
  "https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80";

function statusFromHealth(health: number): IsoZone["status"] {
  if (health >= 75) return "healthy";
  if (health >= 45) return "warning";
  return "critical";
}

function convertPlant(crop: CropStatus, sourceZone: string, idx: number): PlantSlide {
  return {
    id: `${sourceZone}-${crop.name}-${idx}`,
    name: crop.name,
    sourceZone,
    growthStage: crop.growth_stage,
    health: crop.health,
    daysToHarvest: crop.days_to_harvest,
    biomass: crop.biomass_g,
  };
}

function buildCategory(
  id: CategoryId,
  subtitle: string,
  title: string,
  sourceZones: Zone[]
): ZoneCategory {
  const crops = sourceZones.flatMap((zone) =>
    zone.crops.map((crop, idx) => convertPlant(crop, zone.zone_id, idx))
  );
  const avgHealth =
    crops.length > 0 ? crops.reduce((sum, crop) => sum + crop.health, 0) / crops.length : 100;

  return {
    id,
    title,
    subtitle,
    status: statusFromHealth(avgHealth),
    healthPct: Math.round(avgHealth),
    plants: crops,
  };
}

export function Dashboard() {
  const { state, isLoading, error, tick } = useGreenhouse();
  const { nutrition } = useNutrition(state?.total_ticks);
  const { messages, isLoading: chatLoading, sendMessage } = useAgentChat();
  const { enabled: autoTickEnabled, isLoading: autoTickLoading, toggle: toggleAutoTick } = useAutoTick();
  const [activeZone, setActiveZone] = useState<CategoryId>("A");
  const [activePlantId, setActivePlantId] = useState<string | null>(null);
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showPlantDetail, setShowPlantDetail] = useState(false);
  const sourceZones = state?.zones ?? [];
  const byId = useMemo(() => {
    const zoneMap = new Map(sourceZones.map((zone) => [zone.zone_id, zone]));

    const a = buildCategory("A", "Leafy", "Zone A", zoneMap.get("A") ? [zoneMap.get("A") as Zone] : []);
    const b = buildCategory("B", "Fruiting", "Zone B", zoneMap.get("B") ? [zoneMap.get("B") as Zone] : []);
    const c = buildCategory("C", "Staples", "Zone C", zoneMap.get("C") ? [zoneMap.get("C") as Zone] : []);
    const dSources = ["D", "E", "F"]
      .map((id) => zoneMap.get(id))
      .filter((zone): zone is Zone => Boolean(zone));
    const d = buildCategory("D", "Emergency", "Zone D", dSources);

    return { A: a, B: b, C: c, D: d };
  }, [sourceZones]);

  const currentZone = byId[activeZone];
  const selectedPlant =
    currentZone.plants.find((plant) => plant.id === activePlantId) ?? currentZone.plants[0] ?? null;

  const isoZones: IsoZone[] = (["A", "B", "C", "D"] as CategoryId[]).map((id) => ({
    id,
    title: byId[id].title,
    subtitle: byId[id].subtitle,
    healthPct: byId[id].healthPct,
    status: byId[id].status,
  }));

  const foodCoverage =
    typeof nutrition?.overall_min_coverage_percent === "number"
      ? nutrition.overall_min_coverage_percent
      : 0;
  const allCrops = sourceZones.flatMap((zone) => zone.crops);
  const greenhouseHealth =
    allCrops.length > 0 ? allCrops.reduce((sum, crop) => sum + crop.health, 0) / allCrops.length : 100;
  const avgCo2 =
    sourceZones.length > 0
      ? sourceZones.reduce((sum, zone) => sum + zone.co2_ppm, 0) / sourceZones.length
      : 1200;
  const co2Balance = Math.max(0, 100 - Math.abs(avgCo2 - 1200) / 10);
  const waterReservoir = state?.resources.water_reservoir_l ?? 0;
  const batteryPercent = state?.resources.battery_percent ?? 0;
  const batteryKwh = state?.resources.battery_charge_kwh ?? 0;
  const powerConsumptionKw = state?.resources.power_consumption_kw ?? 1;

  const recommendationBars = [
    {
      label: "Routine",
      text: `Maintain ${activeZone} growth profile for stable output.`,
      tone: "bg-[#e8f5ee] border-[#b8dfc8] text-[#14653a]",
    },
    {
      label: "Today",
      text: `Check pH and irrigation alignment for Zone ${activeZone}.`,
      tone: "bg-[#fff8e4] border-[#edd58f] text-[#7a5b09]",
    },
    {
      label: "Urgent",
      text: state?.environment.dust_storm_active
        ? "Storm triage active: prioritize near-harvest plants."
        : "Keep storm protocol ready if weather shifts.",
      tone: "bg-[#fdecec] border-[#f0bbbb] text-[#8c2121]",
    },
  ];

  const resourceBars = [
    {
      label: "Food coverage",
      value: foodCoverage,
      suffix: "%",
      color: "bg-[#D84D4D]",
      note: foodCoverage < 80 ? "Critical" : "Healthy",
      noteTone: foodCoverage < 80 ? "text-[#C54B2F]" : "text-[#1f7a46]",
    },
    {
      label: "Water reserve",
      value: Math.min(100, (waterReservoir / 2500) * 100),
      suffix: "%",
      color: "bg-[#5A66D6]",
      note: `${Math.round(waterReservoir / 50)} days reserve`,
      noteTone: "text-[#1f7a46]",
    },
    {
      label: "Battery",
      value: batteryPercent,
      suffix: "%",
      color: "bg-[#D39B3E]",
      note: `${Math.round((batteryKwh / Math.max(powerConsumptionKw, 0.1)) * 4)} hrs reserve`,
      noteTone: "text-[#1f7a46]",
    },
    {
      label: "CO2/O2 balance",
      value: co2Balance,
      suffix: "%",
      color: "bg-[#8AB6E8]",
      note: "Stable",
      noteTone: "text-[#1f7a46]",
    },
  ];

  if (isLoading || !state) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-mars-green animate-spin" />
          <span className="text-sm font-mono text-muted-foreground">
            CONNECTING TO GREENHOUSE…
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <span className="text-sm font-mono text-mars-red">LINK FAILED</span>
          <span className="text-xs text-muted-foreground">{error}</span>
          <span className="text-[10px] text-muted-foreground">
            Set <code className="text-mars-green">NEXT_PUBLIC_USE_MOCK=true</code> for offline mode
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f5f3] p-3 text-[#1f2a24]">
      <div className="mx-auto flex max-w-[1450px] flex-col gap-3">
        <header className="rounded-2xl border border-[#d9e5de] bg-white px-5 py-3 shadow-[0_2px_10px_rgba(1,0,102,0.04)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-[#6f7c74]">Sol {state.sol} · Tick {state.tick}/4</p>
              <h1 className="text-5xl font-semibold tracking-tight text-[#18211c]">Welcome back, NELAN</h1>
              <p className="mt-1 text-sm text-[#77857d]">Mission greenhouse command</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleAutoTick}
                disabled={autoTickLoading}
                className="rounded-full border border-[#d2ddd7] bg-white px-4 py-2 text-sm hover:bg-[#f5faf7]"
              >
                {autoTickEnabled ? "Auto On" : "Auto"}
              </button>
              <button
                type="button"
                onClick={tick}
                className="rounded-full border border-[#d2ddd7] bg-white px-4 py-2 text-sm hover:bg-[#f5faf7]"
              >
                Tick
              </button>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#d2ddd7] bg-white text-sm font-medium text-[#67746d]"
                aria-label="Astronaut profile placeholder"
              >
                +
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border border-[#d9e5de] bg-white p-3 shadow-[0_2px_10px_rgba(1,0,102,0.04)]">
            <h2 className="mb-2 text-sm font-medium text-[#6f7c74]">Zone overview (A-D categories)</h2>
            <IsometricGreenhouse
              zones={isoZones}
              activeZoneId={activeZone}
              onZoneClick={(zoneId) => {
                setActiveZone(zoneId);
                const firstPlant = byId[zoneId].plants[0];
                setActivePlantId(firstPlant?.id ?? null);
                setShowZoneModal(true);
                setShowPlantDetail(false);
              }}
            />
            <p className="mt-3 text-sm text-[#5f6e66]">
              Click Zone A, B, C, or D to open the zone window with plant slides.
            </p>
          </section>

          <aside className="flex flex-col gap-3">
            <section className="rounded-2xl border border-[#d9e5de] bg-white p-3 shadow-[0_2px_10px_rgba(1,0,102,0.04)]">
              <h2 className="text-sm font-medium text-[#6f7c74]">Mission status</h2>
              <div className="mt-2 rounded-xl border border-[#d9e5de] bg-[#f7fbf8] p-3">
                <div className="flex items-center justify-between text-sm">
                  <p className="text-[#2b3a33]">Greenhouse Health</p>
                  <p className="font-semibold text-[#1f7a46]">
                    {greenhouseHealth.toFixed(0)}% HEALTHY
                  </p>
                </div>
                <div className="mt-2 h-3 rounded-full border border-[#c9ddd1] bg-white">
                  <div
                    className="h-full rounded-full bg-[#63c26f]"
                    style={{ width: `${Math.max(0, Math.min(100, greenhouseHealth))}%` }}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#d9e5de] bg-white p-3 shadow-[0_2px_10px_rgba(1,0,102,0.04)]">
              <h2 className="text-sm font-medium text-[#6f7c74]">Recommended actions</h2>
              <div className="mt-2 space-y-2">
                {recommendationBars.map((item) => (
                  <div key={item.label} className={`rounded-xl border px-3 py-2 ${item.tone}`}>
                    <p className="text-xs font-semibold uppercase">{item.label}</p>
                    <p className="text-sm">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#d9e5de] bg-white p-3 shadow-[0_2px_10px_rgba(1,0,102,0.04)]">
              <h2 className="text-sm font-medium text-[#6f7c74]">Resource bars</h2>
              <div className="mt-2 space-y-2">
                {resourceBars.map((bar) => (
                  <div key={bar.label} className="grid grid-cols-[110px_1fr_auto] items-center gap-2">
                    <span className="text-sm">{bar.label}</span>
                    <div className="h-3 rounded-full border border-[#d8e1dc] bg-[#f5f7f6]">
                      <div
                        className={`h-full rounded-full ${bar.color}`}
                        style={{ width: `${Math.max(0, Math.min(100, bar.value))}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold">
                        {bar.value.toFixed(0)}
                        {bar.suffix}
                    </span>
                    <span className={`col-span-3 text-xs ${bar.noteTone}`}>{bar.note}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="flex min-h-[260px] flex-col rounded-2xl border border-[#d9e5de] bg-white p-3 shadow-[0_2px_10px_rgba(1,0,102,0.04)]">
              <h2 className="text-sm font-medium text-[#6f7c74]">AI chat</h2>
              <div className="mt-2 flex-1 space-y-2 overflow-y-auto rounded-xl border border-[#e0e8e3] bg-[#fafcfb] p-2">
                {messages.length === 0 ? (
                  <p className="text-xs text-[#7a8880]">Ask the AI about zone actions or weather forecast.</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`max-w-[90%] rounded-lg border px-2 py-1 text-xs ${
                        msg.role === "user"
                          ? "ml-auto border-[#bddac9] bg-[#ebf7f0]"
                          : "border-[#d8e4dd] bg-white"
                      }`}
                    >
                      {msg.content}
                    </div>
                  ))
                )}
                {chatLoading && <p className="text-xs text-[#7a8880]">Agent typing...</p>}
              </div>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const input = form.elements.namedItem("prompt") as HTMLInputElement;
                  const value = input.value.trim();
                  if (!value) return;
                  sendMessage(value);
                  input.value = "";
                }}
              >
                <input
                  name="prompt"
                  className="flex-1 rounded-lg border border-[#d8e3dc] bg-white px-3 py-2 text-sm outline-none focus:border-[#019934]"
                  placeholder="Ask AI agent..."
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[#019934] px-4 py-2 text-sm font-semibold text-white hover:bg-[#017d2b]"
                >
                  Send
                </button>
              </form>
            </section>
          </aside>
        </div>
      </div>

      {showZoneModal ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0b1410]/25 p-6">
          <div className="w-full max-w-5xl rounded-3xl border border-[#d6e3dc] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-4xl font-semibold text-[#142019]">
                {currentZone.title} - {currentZone.subtitle}
              </h3>
              <button
                type="button"
                onClick={() => setShowZoneModal(false)}
                className="rounded-full border border-[#d5e2db] p-2 text-[#54635b]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              {currentZone.plants.map((plant) => (
                <button
                  key={plant.id}
                  type="button"
                  onClick={() => {
                    setActivePlantId(plant.id);
                    setShowPlantDetail(false);
                  }}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    selectedPlant?.id === plant.id
                      ? "border-[#019934] bg-[#eff8f2] text-[#14653a]"
                      : "border-[#d5e1da] bg-white text-[#4f5d56] hover:bg-[#f7faf8]"
                  }`}
                >
                  {plant.name}
                </button>
              ))}
            </div>

            {selectedPlant ? (
              <button
                type="button"
                onClick={() => setShowPlantDetail(true)}
                className="grid w-full gap-3 rounded-2xl border border-[#d7e4dc] bg-[#fbfdfc] p-3 text-left md:grid-cols-[280px_1fr]"
              >
                <img
                  src={categoryImage[activeZone]}
                  alt={`${selectedPlant.name} in ${currentZone.title}`}
                  className="h-48 w-full rounded-xl object-cover"
                />
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <p className="text-[#6c7a73]">Growth stage</p>
                  <p className="font-semibold capitalize">{selectedPlant.growthStage}</p>
                  <p className="text-[#6c7a73]">Health</p>
                  <p className="font-semibold">{selectedPlant.health.toFixed(1)}%</p>
                  <p className="text-[#6c7a73]">Days to harvest</p>
                  <p className="font-semibold">{selectedPlant.daysToHarvest.toFixed(1)} sols</p>
                  <p className="text-[#6c7a73]">Biomass</p>
                  <p className="font-semibold">{selectedPlant.biomass.toFixed(1)} g</p>
                </div>
              </button>
            ) : (
              <div className="rounded-xl border border-dashed border-[#d6e1db] bg-[#f8fbf9] p-4 text-sm text-[#6f7c74]">
                No plants currently assigned to this category.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {showPlantDetail && selectedPlant ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b1410]/35 p-6">
          <div className="w-full max-w-6xl rounded-3xl border border-[#d6e3dc] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-4xl font-semibold text-[#142019]">{selectedPlant.name} Plant</h3>
              <button
                type="button"
                onClick={() => setShowPlantDetail(false)}
                className="rounded-full border border-[#d5e2db] p-2 text-[#54635b]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="rounded-2xl border border-[#d8e5de] bg-[#f7fbf8] p-4">
                <img
                  src={detailLeafImage}
                  alt={`${selectedPlant.name} detailed preview`}
                  className="h-[360px] w-full rounded-2xl object-cover"
                />
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-[#d8e5de] bg-[#f8fbf9] p-4">
                  <h4 className="text-2xl font-semibold">Plant health</h4>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl border border-[#e0e8e3] bg-white p-2">
                      <p className="text-[#6f7c74]">Water level</p>
                      <p className="font-semibold">{state.resources.water_reservoir_l.toFixed(0)} L</p>
                    </div>
                    <div className="rounded-xl border border-[#e0e8e3] bg-white p-2">
                      <p className="text-[#6f7c74]">Humidity</p>
                      <p className="font-semibold">{state.zones[0]?.humidity.toFixed(0) ?? "-"}%</p>
                    </div>
                    <div className="rounded-xl border border-[#e0e8e3] bg-white p-2">
                      <p className="text-[#6f7c74]">Light</p>
                      <p className="font-semibold">{state.zones[0]?.par_level.toFixed(0) ?? "-"} PAR</p>
                    </div>
                    <div className="rounded-xl border border-[#e0e8e3] bg-white p-2">
                      <p className="text-[#6f7c74]">Fertilization</p>
                      <p className="font-semibold">pH {state.resources.nutrient_ph.toFixed(1)}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#d8e5de] bg-white p-4">
                  <h4 className="text-xl font-semibold">Recent updates</h4>
                  <ul className="mt-2 space-y-2 text-sm">
                    <li className="flex items-center justify-between rounded-lg border border-[#e0e8e3] p-2">
                      <span>Growth stage</span>
                      <span className="rounded-full bg-[#eaf6ef] px-2 py-0.5 text-[#1f7a46] capitalize">
                        {selectedPlant.growthStage}
                      </span>
                    </li>
                    <li className="flex items-center justify-between rounded-lg border border-[#e0e8e3] p-2">
                      <span>Health</span>
                      <span className="rounded-full bg-[#f8f0d8] px-2 py-0.5 text-[#7a5b09]">
                        {selectedPlant.health.toFixed(1)}%
                      </span>
                    </li>
                    <li className="flex items-center justify-between rounded-lg border border-[#e0e8e3] p-2">
                      <span>Days to harvest</span>
                      <span className="rounded-full bg-[#ebf2fb] px-2 py-0.5 text-[#1e4f8f]">
                        {selectedPlant.daysToHarvest.toFixed(1)} sols
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
