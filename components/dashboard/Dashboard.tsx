"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [forcedAlertProposal, setForcedAlertProposal] = useState<AlertItem | null>(null);
  const [acceptedForcedAlerts, setAcceptedForcedAlerts] = useState<AlertItem[]>([]);
  const [isAcceptingForcedAlert, setIsAcceptingForcedAlert] = useState(false);
  const [forcedAlertError, setForcedAlertError] = useState<string | null>(null);
  const [hiddenAlertIds, setHiddenAlertIds] = useState<Set<string>>(new Set());
  const seenAlertIdsRef = useRef<Set<string>>(new Set(alerts.map((alert) => alert.id)));
  const alertTimeoutRef = useRef<number | null>(null);
  const headerAnchorRef = useRef<HTMLDivElement | null>(null);
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);

  const playAlertSound = useCallback(() => {
    if (typeof window === "undefined") return;

    if (!alertAudioRef.current) {
      const audio = new Audio("/sounds/alert-8.mp3");
      audio.preload = "auto";
      alertAudioRef.current = audio;
    }

    const audio = alertAudioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Ignore autoplay rejections when no user interaction happened yet.
    });
  }, []);

  const topAlerts = useMemo(() => {
    const actionQueueTexts = new Set(actionQueue.map((item) => item.text.trim()));
    const nonDuplicateAlerts = alerts.filter((alert) => !actionQueueTexts.has(alert.text.trim()));
    const candidateAlerts = nonDuplicateAlerts.length > 0 ? nonDuplicateAlerts : alerts;
    return [...candidateAlerts].sort((a, b) => priorityRank(a.urgency) - priorityRank(b.urgency)).slice(0, 2);
  }, []);

  const visibleTopAlerts = useMemo(() => {
    const baseAlerts = topAlerts.filter((alert) => !hiddenAlertIds.has(alert.id));
    return [...acceptedForcedAlerts, ...baseAlerts];
  }, [acceptedForcedAlerts, topAlerts, hiddenAlertIds]);

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
    playAlertSound();
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
  }, [topAlerts, playAlertSound]);

  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current !== null) {
        window.clearTimeout(alertTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "f") return;
      if (event.repeat) return;

      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName.toLowerCase();
        if (tag === "input" || tag === "textarea" || target.isContentEditable) return;
      }

      setForcedAlertProposal((prev) => {
        if (prev) return prev;
        playAlertSound();
        setForcedAlertError(null);
        return {
          id: `forced-${Date.now()}`,
          category: "Sand storm",
          urgency: "critical",
          text: "Sand storm alert: optical depth spike detected. Initiate Tier 1/2/3 storm triage now.",
          timestamp: "Just now",
        };
      });
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playAlertSound]);

  async function acceptForcedAlert() {
    if (!forcedAlertProposal) return;
    if (isAcceptingForcedAlert) return;

    setIsAcceptingForcedAlert(true);
    setForcedAlertError(null);
    try {
      const response = await fetch("/api/motor/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_id: forcedAlertProposal.id }),
      });
      if (!response.ok) {
        let detail = "Motor trigger request failed";
        try {
          const payload = (await response.json()) as { detail?: string };
          if (payload.detail) detail = payload.detail;
        } catch {
          // Keep default detail.
        }
        throw new Error(detail);
      }

      setAcceptedForcedAlerts((prev) => [forcedAlertProposal, ...prev]);
      setForcedAlertProposal(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Motor trigger request failed";
      setForcedAlertError(message);
      console.error("Accept alert motor trigger failed:", error);
    } finally {
      setIsAcceptingForcedAlert(false);
    }
  }

  function denyForcedAlert() {
    setForcedAlertProposal(null);
    setForcedAlertError(null);
  }

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
            forcedAlertProposal={forcedAlertProposal}
            onAcceptForcedAlert={acceptForcedAlert}
            onDenyForcedAlert={denyForcedAlert}
            isProcessingForcedAlert={isAcceptingForcedAlert}
            forcedAlertError={forcedAlertError}
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
