"use client";

import { useGreenhouse } from "@/hooks/use-greenhouse";
import { useNutrition } from "@/hooks/use-nutrition";
import { useAgentChat } from "@/hooks/use-agent-chat";
import { useAutoTick } from "@/hooks/use-auto-tick";
import { MarsHeader } from "./MarsHeader";
import { ZoneGrid } from "./zones/ZoneGrid";
import { ResourcePanel } from "./resources/ResourcePanel";
import { SidePanel } from "./sidebar/SidePanel";
import { ScanlineOverlay } from "./ScanlineOverlay";
import { Loader2 } from "lucide-react";

export function Dashboard() {
  const { state, isLoading, error, tick } = useGreenhouse();
  const { nutrition } = useNutrition(state?.total_ticks);
  const { messages, isLoading: chatLoading, sendMessage } = useAgentChat();
  const { enabled: autoTickEnabled, isLoading: autoTickLoading, toggle: toggleAutoTick } = useAutoTick();

  if (isLoading || !state) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-mars-green animate-spin" />
          <span className="text-sm font-mono text-muted-foreground">
            CONNECTING TO GREENHOUSE…
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <span className="text-sm font-mono text-mars-red">LINK FAILED</span>
          <span className="text-xs text-muted-foreground">{error}</span>
          <span className="text-[10px] text-muted-foreground">
            Set <code className="text-mars-green">NEXT_PUBLIC_USE_MOCK=true</code> for offline mode
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col p-3 gap-3 overflow-hidden">
      <ScanlineOverlay />

      {/* Header */}
      <MarsHeader
        state={state}
        autoTickEnabled={autoTickEnabled}
        autoTickLoading={autoTickLoading}
        onToggleAutoTick={toggleAutoTick}
        onTick={tick}
      />

      {/* Main content area */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3">
        {/* Left — zones + resources */}
        <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
          <ZoneGrid zones={state.zones} />
          <ResourcePanel
            resources={state.resources}
            zones={state.zones}
            environment={state.environment}
            nutrition={nutrition}
          />
        </div>

        {/* Right — sidebar */}
        <div className="w-full lg:w-[340px] shrink-0 min-h-0 overflow-y-auto custom-scrollbar">
          <SidePanel
            nutrition={nutrition}
            chatMessages={messages}
            chatLoading={chatLoading}
            onSendChat={sendMessage}
          />
        </div>
      </div>
    </div>
  );
}
