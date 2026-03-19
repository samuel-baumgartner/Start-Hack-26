import { AlertCircle, Battery, Droplets, Leaf } from "lucide-react";
import { ProgressBar } from "@/components/shared/ProgressBar";
import type { MetricBar } from "@/types/greenhouse";

interface StatusBarsProps {
  bars: MetricBar[];
}

function barGradient(bar: MetricBar): string {
  switch (bar.color) {
    case "mixed":
      return "bg-gradient-to-r from-[#ef4444] to-[#f59e0b]";
    case "blue":
      return "bg-gradient-to-r from-[#56a4ff] to-[#2d6fca]";
    case "amber":
      return "bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]";
    case "green":
      return "bg-gradient-to-r from-[#22c55e] to-[#009f3c]";
    default:
      return "bg-[#009f3c]";
  }
}

function iconFor(id: MetricBar["id"]) {
  if (id === "food") return <Leaf className="h-5 w-5 text-[#2f8f49]" />;
  if (id === "water") return <Droplets className="h-5 w-5 text-[#2d6fca]" />;
  if (id === "battery") return <Battery className="h-5 w-5 text-[#c17f08]" />;
  return <AlertCircle className="h-5 w-5 text-[#10754f]" />;
}

export function StatusBars({ bars }: StatusBarsProps) {
  return (
    <section className="panel-card rounded-3xl p-4">
      <h2 className="mb-2 text-lg font-semibold uppercase tracking-wide text-[#496856]">Mission Status</h2>
      <div className="space-y-2.5">
        {bars.map((bar) => (
          <div key={bar.id} className="grid grid-cols-[190px_minmax(0,1fr)_170px] items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-[#264336]">
              {iconFor(bar.id)}
              <span>{bar.label}</span>
            </div>
            <ProgressBar value={bar.value} gradientClass={barGradient(bar)} className="h-2.5" />
            <div
              className={`text-right text-sm ${
                bar.statusLevel === "critical"
                  ? "text-[#b91c1c]"
                  : bar.statusLevel === "warning"
                    ? "text-[#b45309]"
                    : "text-[#176534]"
              }`}
            >
              {bar.statusText}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
