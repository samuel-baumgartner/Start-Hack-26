"use client";

import { cn } from "@/lib/utils";

type Status = "nominal" | "warning" | "critical";

const statusStyles: Record<Status, string> = {
  nominal: "bg-mars-green/15 text-mars-green border-mars-green/30",
  warning: "bg-mars-yellow/15 text-mars-yellow border-mars-yellow/30",
  critical: "bg-mars-red/15 text-mars-red border-mars-red/30",
};

interface StatusBadgeProps {
  status: Status;
  children: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

export function StatusBadge({ status, children, pulse, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium font-mono",
        statusStyles[status],
        pulse && "animate-alert-pulse",
        className,
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "nominal" && "bg-mars-green",
          status === "warning" && "bg-mars-yellow",
          status === "critical" && "bg-mars-red",
        )}
      />
      {children}
    </span>
  );
}
