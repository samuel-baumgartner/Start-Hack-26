"use client";

import {
  Droplets,
  Battery,
  Leaf,
  Sprout,
  HeartPulse,
  Wind,
  CloudFog,
  ShieldAlert,
  Snowflake,
  Scissors,
  Orbit,
  Droplet,
  FlaskConical,
} from "lucide-react";
import type { NutritionData, SimEnvironment, SimResources, Zone } from "@/lib/types";
import { CapacityGauge } from "./CapacityGauge";

interface ResourcePanelProps {
  resources: SimResources;
  zones: Zone[];
  environment: SimEnvironment;
  nutrition: NutritionData | null;
}

export function ResourcePanel({
  resources,
  zones,
  environment,
  nutrition,
}: ResourcePanelProps) {
  const waterPercent = (resources.water_reservoir_l / 2500) * 100; // 2500L capacity
  const nutrientHealth = ((resources.nutrient_ph >= 5.5 && resources.nutrient_ph <= 7.0) ? 80 : 40) +
    ((resources.nutrient_ec >= 1.0 && resources.nutrient_ec <= 2.5) ? 20 : -20);
  const foodCoverage =
    typeof nutrition?.overall_min_coverage_percent === "number"
      ? nutrition.overall_min_coverage_percent
      : 0;

  const allCrops = zones.flatMap((zone) => zone.crops);
  const greenhouseHealth = allCrops.length
    ? allCrops.reduce((sum, crop) => sum + crop.health, 0) / allCrops.length
    : 0;

  const avgZoneCo2 =
    zones.length > 0
      ? zones.reduce((sum, zone) => sum + zone.co2_ppm, 0) / zones.length
      : 0;
  const co2Target = 1200;
  const o2Target = 20.9;
  const co2Score = Math.max(0, 100 - Math.abs(avgZoneCo2 - co2Target) / 12);
  const o2Score = Math.max(0, 100 - Math.abs(environment.o2_percent - o2Target) * 40);
  const airBalancePercent = (co2Score + o2Score) / 2;

  const triage = allCrops.reduce(
    (acc, crop) => {
      if (crop.days_to_harvest <= 10) {
        acc.protect += 1;
      } else if (crop.growth_stage === "seedling" || crop.days_to_harvest > 35) {
        acc.sacrifice += 1;
      } else {
        acc.hibernate += 1;
      }
      return acc;
    },
    { protect: 0, hibernate: 0, sacrifice: 0 }
  );

  const co2ModulePercent = Math.max(0, Math.min(100, 100 - Math.abs(avgZoneCo2 - co2Target) / 10));
  const irrigationModulePercent = Math.max(
    0,
    Math.min(
      100,
      100 - (resources.water_consumed_today_l / Math.max(resources.water_reservoir_l, 1)) * 100
    )
  );
  const nutrientModulePercent = Math.max(0, Math.min(100, nutrientHealth));

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Resources
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        <CapacityGauge
          icon={Droplets}
          label="Water"
          value={resources.water_reservoir_l}
          unit="L"
          percent={waterPercent}
          subLabel={`Used today: ${resources.water_consumed_today_l.toFixed(1)}L`}
          color="blue"
          index={0}
        />
        <CapacityGauge
          icon={Battery}
          label="Battery"
          value={resources.battery_charge_kwh}
          unit="kWh"
          percent={resources.battery_percent}
          subLabel={`Gen: ${resources.power_generation_kw.toFixed(1)}kW / Use: ${resources.power_consumption_kw.toFixed(1)}kW`}
          color="yellow"
          index={1}
        />
        <CapacityGauge
          icon={Leaf}
          label="Nutrients"
          value={resources.nutrient_ph}
          unit={`pH · EC ${resources.nutrient_ec.toFixed(1)}`}
          percent={Math.max(0, Math.min(100, nutrientHealth))}
          subLabel={`Efficiency: ${(resources.solar_panel_efficiency * 100).toFixed(0)}%`}
          color="green"
          index={2}
        />
        <CapacityGauge
          icon={Sprout}
          label="Food coverage"
          value={foodCoverage}
          unit="% daily need"
          percent={Math.max(0, Math.min(100, foodCoverage))}
          subLabel={
            nutrition
              ? "Based on current crop output"
              : "Nutrition feed unavailable"
          }
          color="green"
          index={3}
        />
        <CapacityGauge
          icon={HeartPulse}
          label="Greenhouse health"
          value={greenhouseHealth}
          unit="% avg crop health"
          percent={Math.max(0, Math.min(100, greenhouseHealth))}
          subLabel={`${allCrops.length} crops monitored`}
          color="yellow"
          index={4}
        />
        <CapacityGauge
          icon={Wind}
          label="CO2/O2 balance"
          value={airBalancePercent}
          unit="% stability"
          percent={Math.max(0, Math.min(100, airBalancePercent))}
          subLabel={`O2 ${environment.o2_percent.toFixed(1)}% · CO2 ${avgZoneCo2.toFixed(0)} ppm`}
          color="blue"
          index={5}
        />
      </div>

      <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <CloudFog className="h-4 w-4 text-mars-yellow" />
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Storm triage protocol
            </h3>
          </div>

          <div className="rounded-md border border-border/60 bg-white/[0.02] p-3 mb-3">
            <p className="text-[11px] font-mono text-muted-foreground">
              Storm mode:{" "}
              <span className={environment.dust_storm_active ? "text-mars-yellow" : "text-mars-green"}>
                {environment.dust_storm_active
                  ? `ACTIVE (${environment.dust_storm_remaining_sols.toFixed(1)} sols left)`
                  : "standby"}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-md border border-border/60 p-2">
              <p className="flex items-center gap-1 text-mars-green font-medium">
                <ShieldAlert className="h-3.5 w-3.5" />
                Protect
              </p>
              <p className="mt-1 font-mono">{triage.protect} crops</p>
              <p className="text-muted-foreground">Near harvest</p>
            </div>
            <div className="rounded-md border border-border/60 p-2">
              <p className="flex items-center gap-1 text-mars-yellow font-medium">
                <Snowflake className="h-3.5 w-3.5" />
                Hibernate
              </p>
              <p className="mt-1 font-mono">{triage.hibernate} crops</p>
              <p className="text-muted-foreground">Slow growth mode</p>
            </div>
            <div className="rounded-md border border-border/60 p-2">
              <p className="flex items-center gap-1 text-mars-red font-medium">
                <Scissors className="h-3.5 w-3.5" />
                Sacrifice
              </p>
              <p className="mt-1 font-mono">{triage.sacrifice} crops</p>
              <p className="text-muted-foreground">Low investment</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Orbit className="h-4 w-4 text-mars-blue" />
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Optimization modules
            </h3>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="flex items-center gap-1">
                  <Orbit className="h-3.5 w-3.5 text-mars-blue" />
                  CO2 pulse enrichment
                </span>
                <span className="font-mono">{co2ModulePercent.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-mars-blue" style={{ width: `${co2ModulePercent}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="flex items-center gap-1">
                  <Droplet className="h-3.5 w-3.5 text-mars-yellow" />
                  Gravity-aware irrigation
                </span>
                <span className="font-mono">{irrigationModulePercent.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-mars-yellow" style={{ width: `${irrigationModulePercent}%` }} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="flex items-center gap-1">
                  <FlaskConical className="h-3.5 w-3.5 text-mars-green" />
                  Predictive nutrients
                </span>
                <span className="font-mono">{nutrientModulePercent.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full bg-mars-green" style={{ width: `${nutrientModulePercent}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
