import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { HealthLevel } from "@/types/greenhouse";
import { levelColors } from "@/utils/statusColors";

interface StatusBadgeProps {
  level: HealthLevel;
  children: ReactNode;
  className?: string;
}

export function StatusBadge({ level, children, className }: StatusBadgeProps) {
  const colors = levelColors(level);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold",
        colors.text,
        colors.soft,
        className,
      )}
    >
      {children}
    </span>
  );
}
