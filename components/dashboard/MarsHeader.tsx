"use client";

import { motion } from "framer-motion";
import { Sun, Moon, Zap, Play, Pause, SkipForward, AlertTriangle, Bug, BatteryWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { SimState } from "@/lib/types";
import { StatusBadge } from "./shared/StatusBadge";

interface MarsHeaderProps {
  state: SimState;
  autoTickEnabled: boolean;
  autoTickLoading: boolean;
  onToggleAutoTick: () => void;
  onTick: () => void;
}

export function MarsHeader({
  state,
  autoTickEnabled,
  autoTickLoading,
  onToggleAutoTick,
  onTick,
}: MarsHeaderProps) {
  const { sol, tick, is_daytime, environment } = state;
  const hasAlerts =
    environment.dust_storm_active ||
    environment.disease_active ||
    environment.power_failure_active;

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5"
    >
      {/* Left — Sol / Tick / Day-Night */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Sol</span>
            <span className="text-lg font-bold font-mono text-mars-green data-value">{sol}</span>
          </div>
          <span className="text-muted-foreground/40">·</span>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Tick</span>
            <span className="text-sm font-mono text-foreground data-value">{tick}/4</span>
          </div>
          <span className="text-muted-foreground/40">·</span>
          {is_daytime ? (
            <Sun className="h-4 w-4 text-mars-yellow" />
          ) : (
            <Moon className="h-4 w-4 text-mars-blue" />
          )}
        </div>
      </div>

      {/* Center — Active Alerts */}
      <div className="flex items-center gap-2">
        {environment.dust_storm_active && (
          <StatusBadge status="critical" pulse>
            <AlertTriangle className="h-3 w-3" />
            DUST STORM ({environment.dust_storm_remaining_sols} sols)
          </StatusBadge>
        )}
        {environment.disease_active && (
          <StatusBadge status="warning" pulse>
            <Bug className="h-3 w-3" />
            DISEASE — Zone {environment.disease_zone_id}
          </StatusBadge>
        )}
        {environment.power_failure_active && (
          <StatusBadge status="critical" pulse>
            <BatteryWarning className="h-3 w-3" />
            POWER FAILURE
          </StatusBadge>
        )}
        {!hasAlerts && (
          <span className="text-xs font-mono text-mars-green/60 flex items-center gap-1.5">
            <Zap className="h-3 w-3" />
            ALL SYSTEMS NOMINAL
          </span>
        )}
      </div>

      {/* Right — Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleAutoTick}
          disabled={autoTickLoading}
          className={cn(
            "font-mono text-xs gap-1.5",
            autoTickEnabled && "border-mars-green/40 text-mars-green",
          )}
        >
          {autoTickEnabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          {autoTickEnabled ? "AUTO" : "AUTO"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onTick}
          className="font-mono text-xs gap-1.5"
        >
          <SkipForward className="h-3 w-3" />
          TICK
        </Button>
      </div>
    </motion.header>
  );
}
