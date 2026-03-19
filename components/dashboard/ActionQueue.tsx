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
  });

  return (
    <section className="panel-card rounded-3xl p-6">
      <h2 className="mb-4 text-xl font-semibold uppercase tracking-wide text-[#496856]">Action Queue</h2>
      <div className="custom-scrollbar max-h-[360px] space-y-3 overflow-y-auto pr-1">
        {sortedActions.map((item) => (
          <article
            key={item.id}
            className={`rounded-2xl border border-[#e3ede4] border-l-4 bg-white/90 p-4 ${urgencyBorder(item.urgency)}`}
          >
            <div className="mb-1 flex items-start justify-between gap-2">
              <p className="text-base text-[#244032]">{item.text}</p>
              {item.urgency === "critical" ? (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#ef4444]" />
              ) : item.urgency === "warning" ? (
                <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#f59e0b]" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#009f3c]" />
              )}
            </div>
            <p className="text-sm font-mono text-[#688772]">{item.timestamp}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
