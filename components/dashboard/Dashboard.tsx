"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { actionQueue, statusBars } from "@/data/actions";
import { greenhouseHealth, healthLog, astronautProfile, crewTeam } from "@/data/zones";
import { alerts } from "@/data/alerts";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { StatusBars } from "./StatusBars";
import { ActionQueue } from "./ActionQueue";
import { AIChat } from "@/components/chat/AIChat";
import { HexZoneMap } from "@/components/hexzone/HexZoneMap";
import { AlertPanel } from "./AlertPanel";
import type { AlertItem } from "@/types/greenhouse";

function priorityRank(urgency: AlertItem["urgency"]) {
  if (urgency === "critical") return 0;
  if (urgency === "warning") return 1;
  return 2;
}

export function Dashboard() {
  const [activeHeaderAlert, setActiveHeaderAlert] = useState<AlertItem | null>(null);
  const [hiddenAlertIds, setHiddenAlertIds] = useState<Set<string>>(new Set());
  const seenAlertIdsRef = useRef<Set<string>>(new Set(alerts.map((alert) => alert.id)));
  const alertTimeoutRef = useRef<number | null>(null);
  const headerAnchorRef = useRef<HTMLDivElement | null>(null);

  const topAlerts = useMemo(() => {
    const actionQueueTexts = new Set(actionQueue.map((item) => item.text.trim()));
    const nonDuplicateAlerts = alerts.filter((alert) => !actionQueueTexts.has(alert.text.trim()));
    const candidateAlerts = nonDuplicateAlerts.length > 0 ? nonDuplicateAlerts : alerts;
    return [...candidateAlerts].sort((a, b) => priorityRank(a.urgency) - priorityRank(b.urgency)).slice(0, 2);
  }, []);

  const visibleTopAlerts = useMemo(
    () => topAlerts.filter((alert) => !hiddenAlertIds.has(alert.id)),
    [topAlerts, hiddenAlertIds],
  );

  useEffect(() => {
    const seenIds = seenAlertIdsRef.current;
    const newlyArrived = topAlerts.find((alert) => !seenIds.has(alert.id));
    topAlerts.forEach((alert) => seenIds.add(alert.id));
    if (!newlyArrived) return;

    if (alertTimeoutRef.current !== null) {
      window.clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }

    setActiveHeaderAlert(newlyArrived);
    setHiddenAlertIds((prev) => {
      const next = new Set(prev);
      next.add(newlyArrived.id);
      return next;
    });

    headerAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    alertTimeoutRef.current = window.setTimeout(() => {
      setActiveHeaderAlert(null);
      setHiddenAlertIds((prev) => {
        const next = new Set(prev);
        next.delete(newlyArrived.id);
        return next;
      });
      alertTimeoutRef.current = null;
    }, 3200);
  }, [topAlerts]);

  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current !== null) {
        window.clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  return (
    <main className="relative min-h-screen px-6 py-5">
      <div className="subtle-noise pointer-events-none absolute inset-0" />
      <div className="relative mx-auto flex w-full max-w-[1560px] flex-col gap-4">
        <div ref={headerAnchorRef}>
          <Header
            profile={astronautProfile}
            health={greenhouseHealth}
            logEntries={healthLog}
            activeAlert={activeHeaderAlert}
          />
        </div>

        <section className="grid min-h-[760px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid min-h-[760px] grid-rows-[minmax(0,1fr)_auto] gap-4">
            <HexZoneMap />

            <div className="grid self-end gap-3 lg:grid-cols-2">
              <StatusBars bars={statusBars} />
              <ActionQueue actions={actionQueue} />
            </div>
          </div>

          <Sidebar alertView={<AlertPanel topAlerts={visibleTopAlerts} />} teamMembers={crewTeam} chatView={<AIChat />} />
        </section>
      </div>
    </main>
  );
}
