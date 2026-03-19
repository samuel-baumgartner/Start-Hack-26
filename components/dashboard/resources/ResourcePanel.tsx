"use client";

import { Droplets, Battery, Leaf } from "lucide-react";
import type { SimResources } from "@/lib/types";
import { CapacityGauge } from "./CapacityGauge";

interface ResourcePanelProps {
  resources: SimResources;
}

export function ResourcePanel({ resources }: ResourcePanelProps) {
  const waterPercent = (resources.water_reservoir_l / 2500) * 100; // 2500L capacity
  const nutrientHealth = ((resources.nutrient_ph >= 5.5 && resources.nutrient_ph <= 7.0) ? 80 : 40) +
    ((resources.nutrient_ec >= 1.0 && resources.nutrient_ec <= 2.5) ? 20 : -20);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Resources
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
      </div>
    </div>
  );
}
