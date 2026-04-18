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
    <section className="panel-card relative min-h-[min(22rem,48dvh)] overflow-hidden rounded-2xl border border-[#d9e7db] bg-[linear-gradient(165deg,_rgba(255,255,255,0.96),_rgba(245,251,246,0.95)_45%,_rgba(239,247,241,0.95)_100%)] p-4 shadow-[0_16px_40px_rgba(25,63,40,0.1)] sm:h-[420px] sm:rounded-3xl sm:p-5">
      <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-[#e1f3e5] blur-2xl" />
      <div className="pointer-events-none absolute -right-12 top-0 h-24 w-24 rounded-full bg-[#eaf6ec] blur-2xl" />

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold uppercase tracking-wide text-[#3f5e4d]">Mission Status</h2>
        <div className="relative h-16 w-16">
          <span className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f2b394]/50" />
          <div className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_30%_28%,_#ffd0bb,_#ef8f66_45%,_#b84c38_100%)] shadow-[0_8px_18px_rgba(169,67,45,0.35)]">
            <span className="absolute left-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[#f6bf9c]/80" />
            <span className="absolute left-6 top-5 h-1 w-1 rounded-full bg-[#f4b08f]/70" />
            <span className="absolute left-4 top-7 h-2 w-2 rounded-full bg-[#d77857]/70" />
          </div>
          <span className="absolute left-1 top-2 h-2 w-2 rounded-full bg-[#ffe9dc] shadow-[0_0_10px_rgba(255,233,220,0.9)]" />
        </div>
      </div>

      <div className="space-y-3">
        {bars.map((bar) => (
          <div
            key={bar.id}
            className="rounded-2xl border border-[#deeadf] bg-white/85 px-3.5 py-3 shadow-[0_8px_16px_rgba(17,53,34,0.05)]"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-[#264336]">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#d6e6d9] bg-[#f6fbf7]">
                  {iconFor(bar.id)}
                </span>
                <span className="font-medium">{bar.label}</span>
              </div>
              <span className="rounded-full border border-[#cfe2d3] bg-[#eff8f1] px-2.5 py-1 text-xs font-semibold text-[#2b5c42]">
                {bar.value}%
              </span>
            </div>
            <ProgressBar value={bar.value} gradientClass={barGradient(bar)} className="h-2.5" />
          </div>
        ))}
      </div>
    </section>
  );
}
