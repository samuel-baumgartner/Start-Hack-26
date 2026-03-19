import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  gradientClass?: string;
  className?: string;
}

export function ProgressBar({ value, gradientClass, className }: ProgressBarProps) {
  return (
    <div
      className={cn(
        "h-2.5 w-full overflow-hidden rounded-full bg-[#dbe8dc] ring-1 ring-white/70",
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500", gradientClass ?? "bg-[#009f3c]")}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
