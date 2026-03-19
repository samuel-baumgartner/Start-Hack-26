"use client";

import { Bot, CloudSun } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SidebarTab = "chat" | "weather";

interface SidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  chatView: ReactNode;
  weatherView: ReactNode;
}

export function Sidebar({ activeTab, onTabChange, chatView, weatherView }: SidebarProps) {
  return (
    <aside className="glass-card relative flex h-full min-h-[700px] flex-col rounded-3xl p-5">
      <div className="mb-4 grid grid-cols-2 rounded-2xl bg-[#edf4ee] p-1.5">
        <button
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-base font-medium transition-colors",
            activeTab === "chat" ? "bg-[#36398e] text-white" : "text-[#4a6656] hover:bg-white/80",
          )}
          onClick={() => onTabChange("chat")}
        >
          <Bot className="h-5 w-5" />
          AI Chat
        </button>
        <button
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-base font-medium transition-colors",
            activeTab === "weather" ? "bg-[#36398e] text-white" : "text-[#4a6656] hover:bg-white/80",
          )}
          onClick={() => onTabChange("weather")}
        >
          <CloudSun className="h-5 w-5" />
          Weather
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl">
        {activeTab === "chat" ? chatView : weatherView}
      </div>
    </aside>
  );
}
