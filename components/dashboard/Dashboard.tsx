"use client";

import { useState } from "react";
import { actionQueue, statusBars } from "@/data/actions";
import { greenhouseHealth, healthLog, astronautProfile } from "@/data/zones";
import { marsWeather } from "@/data/weather";
import { Header } from "@/components/layout/Header";
import { Sidebar, type SidebarTab } from "@/components/layout/Sidebar";
import { StatusBars } from "./StatusBars";
import { ActionQueue } from "./ActionQueue";
import { AIChat } from "@/components/chat/AIChat";
import { MarsWeather } from "@/components/weather/MarsWeather";
import { HexZoneMap } from "@/components/hexzone/HexZoneMap";

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<SidebarTab>("chat");

  return (
    <main className="relative min-h-screen px-6 py-5">
      <div className="subtle-noise pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex w-full max-w-[1560px] flex-col gap-4">
        <Header profile={astronautProfile} health={greenhouseHealth} logEntries={healthLog} />

        <section className="grid min-h-[760px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid min-h-[760px] grid-rows-[minmax(0,1fr)_auto] gap-4">
            <HexZoneMap />

            <div className="grid self-end gap-3 lg:grid-cols-[minmax(0,1fr)_360px]">
              <StatusBars bars={statusBars} />
              <ActionQueue actions={actionQueue} />
            </div>
          </div>

          <Sidebar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            chatView={<AIChat />}
            weatherView={<MarsWeather data={marsWeather} />}
          />
        </section>
      </div>
    </main>
  );
}
