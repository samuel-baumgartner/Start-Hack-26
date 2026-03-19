import { AlertTriangle, Clock3 } from "lucide-react";
import { alerts } from "@/data/alerts";
import { actionQueue } from "@/data/actions";
import type { AlertItem } from "@/types/greenhouse";

function priorityRank(urgency: "critical" | "warning" | "routine") {
  if (urgency === "critical") return 0;
  if (urgency === "warning") return 1;
  return 2;
}

function categoryClasses(category: AlertItem["category"]) {
  const palette: Record<AlertItem["category"], string> = {
    Harvest: "border-emerald-200 bg-emerald-50 text-emerald-700",
    "Sand storm": "border-amber-200 bg-amber-50 text-amber-700",
    Disease: "border-rose-200 bg-rose-50 text-rose-700",
    Water: "border-sky-200 bg-sky-50 text-sky-700",
    "Nutrient depletion": "border-lime-200 bg-lime-50 text-lime-700",
    Power: "border-orange-200 bg-orange-50 text-orange-700",
    "Plant stress": "border-violet-200 bg-violet-50 text-violet-700",
    "CO2/O2 balance": "border-cyan-200 bg-cyan-50 text-cyan-700",
    Temperature: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    "Emergency reseed": "border-red-200 bg-red-50 text-red-700",
  };

  return palette[category];
}

interface AlertPanelProps {
  topAlerts?: AlertItem[];
}

export function AlertPanel({ topAlerts: topAlertsProp }: AlertPanelProps) {
  const actionQueueTexts = new Set(actionQueue.map((item) => item.text.trim()));
  const nonDuplicateAlerts = alerts.filter((alert) => !actionQueueTexts.has(alert.text.trim()));
  const candidateAlerts = nonDuplicateAlerts.length > 0 ? nonDuplicateAlerts : alerts;

  const topAlerts =
    topAlertsProp ??
    [...candidateAlerts]
      .sort((a, b) => priorityRank(a.urgency) - priorityRank(b.urgency))
      .slice(0, 2);

  return (
    <section className="rounded-2xl border border-[#d7e6d8] bg-white/75 p-3">
      <div className="mb-2 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-[#b45309]" />
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[#496856]">Alerts</h3>
      </div>

      <div className="space-y-2">
        {topAlerts.map((alert) => (
          <article key={alert.id} className="rounded-xl border border-[#e5ece6] bg-white p-2.5">
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${categoryClasses(
                alert.category,
              )}`}
            >
              {alert.category}
            </span>
            <p className="mt-1 text-xs text-[#234032]">{alert.text}</p>
            <p className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] text-[#6b8f6b]">
              <Clock3 className="h-3 w-3" />
              {alert.timestamp}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
