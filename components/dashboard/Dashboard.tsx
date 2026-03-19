"use client";

import { actionQueue, statusBars } from "@/data/actions";
import { greenhouseHealth, healthLog, astronautProfile, crewTeam } from "@/data/zones";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatusBars } from "./StatusBars";
import { ActionQueue } from "./ActionQueue";
import { AIChat } from "@/components/chat/AIChat";
import { HexZoneMap } from "@/components/hexzone/HexZoneMap";
import { AlertPanel } from "./AlertPanel";

export function Dashboard() {
  return (
    <main className="relative min-h-screen px-6 py-5">
      <div className="subtle-noise pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex w-full max-w-[1560px] flex-col gap-4">
        <Header profile={astronautProfile} health={greenhouseHealth} logEntries={healthLog} />

        <section className="grid min-h-[760px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid min-h-[760px] grid-rows-[minmax(0,1fr)_auto] gap-4">
            <HexZoneMap />

            <div className="grid self-end gap-3 lg:grid-cols-2">
              <StatusBars bars={statusBars} />
              <ActionQueue actions={actionQueue} />
            </div>
          </div>

          <Sidebar alertView={<AlertPanel />} teamMembers={crewTeam} chatView={<AIChat />} />
        </section>
      </div>
    </main>
  );
}
