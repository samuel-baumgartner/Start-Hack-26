import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import type { ActionItem } from "@/types/greenhouse";
import { urgencyBorder } from "@/utils/statusColors";

interface ActionQueueProps {
  actions: ActionItem[];
}

export function ActionQueue({ actions }: ActionQueueProps) {
  const sortedActions = [...actions].sort((a, b) => {
    const rank = { critical: 0, warning: 1, routine: 2 };
    return rank[a.urgency] - rank[b.urgency];
  }).slice(0, 3);

  return (
    <section className="panel-card relative min-h-[min(22rem,48dvh)] overflow-hidden rounded-2xl border border-[#d9e5da] bg-[linear-gradient(160deg,_rgba(255,255,255,0.97),_rgba(247,251,248,0.95)_50%,_rgba(241,247,243,0.96)_100%)] p-4 shadow-[0_16px_40px_rgba(25,63,40,0.1)] sm:h-[420px] sm:rounded-3xl sm:p-5">
      <div className="pointer-events-none absolute inset-x-6 bottom-3 h-10 rounded-full bg-[radial-gradient(circle,_rgba(201,83,49,0.18),_rgba(201,83,49,0)_70%)] blur-xl" />

      <h2 className="mb-3 text-lg font-semibold uppercase tracking-wide text-[#3f5e4d]">Action Queue</h2>
      <div className="space-y-3">
        {sortedActions.map((item) => (
          <article
            key={item.id}
            className={`rounded-2xl border border-[#dfe9e1] border-l-4 bg-[linear-gradient(180deg,_rgba(255,255,255,0.95),_rgba(248,252,249,0.92))] p-3 shadow-[0_10px_18px_rgba(16,46,30,0.06)] ${urgencyBorder(item.urgency)}`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-sm leading-relaxed text-[#244032]">{item.text}</p>
              {item.urgency === "critical" ? (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#ef4444]" />
              ) : item.urgency === "warning" ? (
                <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#f59e0b]" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#009f3c]" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-[#d5e5d8] bg-[#eef7f0] px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-[#4e6d59]">
                {item.source}
              </span>
              <p className="text-xs font-mono text-[#688772]">{item.timestamp}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
