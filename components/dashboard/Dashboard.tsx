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
  const previousVisibleNotificationIdRef = useRef<string | null>(null);

  const playAlertSound = useCallback(() => {
    if (typeof window === "undefined") return;

    if (!alertAudioRef.current) {
      const audio = new Audio("/Notification_sound.mpeg");
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
    const visibleNotificationId = forcedAlertProposal?.id ?? activeHeaderAlert?.id ?? null;
    if (!visibleNotificationId) {
      previousVisibleNotificationIdRef.current = null;
      return;
    }
    if (previousVisibleNotificationIdRef.current === visibleNotificationId) return;

    previousVisibleNotificationIdRef.current = visibleNotificationId;
    playAlertSound();
  }, [activeHeaderAlert, forcedAlertProposal, playAlertSound]);

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
  }, []);

  async function acceptForcedAlert() {
    if (!forcedAlertProposal) return;
    if (isAcceptingForcedAlert) return;

    setIsAcceptingForcedAlert(true);
    setForcedAlertError(null);
    try {
      const response = await fetch("/api/motor/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alert_id: forcedAlertProposal.id, duration: 15 }),
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
    <main className="relative min-h-screen overflow-hidden px-6 py-5">
      <div
        className="pointer-events-none absolute left-[-110px] top-[-120px] h-[340px] w-[340px] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(7,169,77,0.28) 0%, rgba(7,169,77,0) 72%)",
        }}
      />
      <div
        className="pointer-events-none absolute right-[-90px] top-[-80px] h-[300px] w-[300px] rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(73,77,224,0.26) 0%, rgba(73,77,224,0) 72%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-[-140px] left-1/2 h-[260px] w-[620px] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(5,108,49,0.14) 0%, rgba(5,108,49,0) 70%)",
        }}
      />
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

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-stretch">
          <div className="grid gap-4">
            <div className="assemble-drop-up" style={{ animationDelay: "120ms" }}>
              <HexZoneMap />
            </div>

            <div className="grid self-end gap-3 lg:auto-rows-fr lg:grid-cols-2">
              <div className="assemble-fly-left h-full" style={{ animationDelay: "420ms" }}>
                <StatusBars bars={statusBars} />
              </div>
              <div className="assemble-fly-right h-full" style={{ animationDelay: "500ms" }}>
                <ActionQueue actions={actionQueue} />
              </div>
            </div>
          </div>

          <div className="assemble-fly-right" style={{ animationDelay: "260ms" }}>
            <Sidebar alertView={<AlertPanel topAlerts={visibleTopAlerts} />} teamMembers={crewTeam} chatView={<AIChat />} />
          </div>
        </section>
      </div>
    </main>
  );
}
