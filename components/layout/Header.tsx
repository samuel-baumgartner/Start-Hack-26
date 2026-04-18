"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertTriangle, ChevronDown } from "lucide-react";
import { CrewAvatar } from "@/components/shared/CrewAvatar";
import { HeartbeatEffectButton } from "@/components/ui/heartbeat-effect-button";
import type { AlertItem, AstronautProfile, GreenhouseHealth, HealthLogEntry } from "@/types/greenhouse";

interface HeaderProps {
  profile: AstronautProfile;
  health: GreenhouseHealth;
  logEntries: HealthLogEntry[];
  activeAlert?: AlertItem | null;
  forcedAlertProposal?: AlertItem | null;
  onAcceptForcedAlert?: () => void;
  onDenyForcedAlert?: () => void;
  isProcessingForcedAlert?: boolean;
  forcedAlertError?: string | null;
}

function alertBadgeClasses(urgency: AlertItem["urgency"]): string {
  if (urgency === "critical") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (urgency === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export function Header({
  profile,
  health,
  logEntries,
  activeAlert,
  forcedAlertProposal,
  onAcceptForcedAlert,
  onDenyForcedAlert,
  isProcessingForcedAlert = false,
  forcedAlertError = null,
}: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const gaugeRadius = 24;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const clampedAnimatedScore = Math.max(0, Math.min(100, animatedScore));
  const gaugeOffset = gaugeCircumference * (1 - clampedAnimatedScore / 100);

  useEffect(() => {
    const targetScore = Math.max(0, Math.min(100, health.score));
    const durationMs = 900;
    const startTime = performance.now();
    let frame = 0;

    function tick(now: number) {
      const progress = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(targetScore * eased);
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    }

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [health.score]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setLogOpen(false);
      }
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <header
      className={`glass-card pulse-ambient fade-in relative isolate overflow-hidden rounded-3xl border border-white/75 p-4 transition-all duration-300 sm:rounded-[28px] sm:p-6 ${
        activeAlert ? "ring-2 ring-amber-300/90 shadow-[0_0_0_10px_rgba(252,211,77,0.22)]" : "sm:hover:-translate-y-0.5"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(108deg,rgba(255,255,255,0.72),rgba(255,255,255,0.26))]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_84%_16%,rgba(73,77,224,0.14),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_84%,rgba(8,163,76,0.13),transparent_36%)]" />
      {forcedAlertProposal ? (
        <div className="relative z-10 flex min-h-0 flex-col gap-4 rounded-2xl border border-red-300/80 bg-red-50/90 px-4 py-4 sm:min-h-[166px] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700 sm:h-14 sm:w-14">
              <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-700">Alert proposal</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-red-200 bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-700">
                  {forcedAlertProposal.category}
                </span>
                <span className="font-mono text-xs text-red-600">{forcedAlertProposal.timestamp}</span>
              </div>
              <p className="mt-2 text-sm font-medium text-red-800 sm:text-base">{forcedAlertProposal.text}</p>
            </div>
          </div>
          <div className="relative z-10 flex w-full shrink-0 flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center sm:self-end sm:pb-1">
            <button
              type="button"
              onClick={onDenyForcedAlert}
              disabled={isProcessingForcedAlert}
              className="rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2"
            >
              Deny
            </button>
            <HeartbeatEffectButton
              type="button"
              onClick={onAcceptForcedAlert}
              disabled={isProcessingForcedAlert}
              className="bg-red-600 px-4 py-2.5 text-sm text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2"
            >
              {isProcessingForcedAlert ? "Starting..." : "Accept"}
            </HeartbeatEffectButton>
          </div>
          {forcedAlertError ? (
            <p className="order-last mt-1 w-full text-xs font-medium text-red-700 sm:order-none sm:absolute sm:bottom-2 sm:left-5 sm:mt-0 sm:w-auto">
              {forcedAlertError}
            </p>
          ) : null}
        </div>
      ) : activeAlert ? (
        <div className="relative z-10 flex min-h-0 flex-col gap-3 rounded-2xl border border-amber-300/80 bg-amber-50/85 px-4 py-4 animate-pulse sm:min-h-[166px] sm:flex-row sm:items-center sm:gap-4 sm:px-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 sm:h-14 sm:w-14">
            <AlertTriangle className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">New alert</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${alertBadgeClasses(
                  activeAlert.urgency,
                )}`}
              >
                {activeAlert.category}
              </span>
              <span className="font-mono text-xs text-[#8d7045]">{activeAlert.timestamp}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-[#4f3a1f] sm:text-base">{activeAlert.text}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="relative z-10 flex min-h-0 flex-col justify-center py-2 sm:min-h-[280px] sm:py-3">
            <div className="mb-5 flex w-full flex-col items-center gap-4 px-1 pt-12 sm:mb-7 sm:flex-row sm:justify-center sm:gap-4 sm:px-0 sm:pt-3 sm:pr-16">
              <div className="relative grid h-[64px] w-[64px] shrink-0 place-items-center rounded-[20px] border border-emerald-200/80 bg-white/80 shadow-[0_12px_24px_rgba(8,89,45,0.2)] sm:h-[70px] sm:w-[70px] sm:rounded-[22px]">
                <svg className="h-[60px] w-[60px] -rotate-90" viewBox="0 0 60 60" aria-hidden="true">
                  <circle cx="30" cy="30" r={gaugeRadius} fill="none" stroke="#dbe8dc" strokeWidth="6" />
                  <circle
                    cx="30"
                    cy="30"
                    r={gaugeRadius}
                    fill="none"
                    stroke="#15a34a"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={gaugeCircumference}
                    strokeDashoffset={gaugeOffset}
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-semibold text-[#1f4e34]">
                  {Math.round(clampedAnimatedScore)}%
                </span>
              </div>
              <div className="max-w-full text-center">
                <p className="mb-1 inline-flex rounded-full border border-emerald-200/70 bg-white/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#2f6f4d]">
                  Mission Control
                </p>
                <h1 className="font-display text-xl font-semibold tracking-tight text-[#112f22] [text-wrap:balance] sm:text-[2.1rem]">
                  Welcome back, <span className="text-[#0c8240]">NELAN</span>
                </h1>
                <p className="mt-1 text-sm text-[#5d7d6b] sm:mt-0 sm:text-base">
                  Autonomous greenhouse guidance is active and synced.
                </p>
              </div>
            </div>

            <div className="absolute right-2 top-2 z-20 sm:right-0 sm:top-2" ref={profileRef}>
              <button
                className="group flex items-center gap-2 rounded-full border border-[#d6e8d8] bg-white/90 px-3 py-2.5 shadow-[0_8px_20px_rgba(17,92,53,0.16)] transition-colors hover:bg-white"
                onClick={() => setProfileOpen((prev) => !prev)}
                aria-label="Open astronaut profile"
              >
                <CrewAvatar avatar={profile.avatar} size="md" />
              </button>

              {profileOpen ? (
                <div className="panel-card absolute right-0 top-14 z-30 w-[min(100vw-2rem,18rem)] max-w-[calc(100vw-1.5rem)] rounded-2xl p-4 text-base sm:w-72">
                  <p className="font-display font-semibold text-[#163126]">{profile.name}</p>
                  <p className="text-sm text-[#607f6a]">{profile.role}</p>
                  <div className="mt-3 space-y-2 text-sm text-[#486554]">
                    <p>
                      Current Sol: <span className="font-mono text-[#1f3f2d]">{profile.sol}</span>
                    </p>
                    <p>
                      Crew ID: <span className="font-mono text-[#1f3f2d]">{profile.crewId}</span>
                    </p>
                    <p>{profile.mission}</p>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="mt-1 w-full space-y-4 sm:mt-2 sm:space-y-6">
              <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-emerald-200/90 bg-emerald-100/90 px-3 py-1.5 text-sm font-semibold text-[#0f7a32] shadow-[0_6px_15px_rgba(7,118,53,0.16)]">
                <span>{health.label}</span>
                <span aria-hidden="true">✓</span>
              </span>
              <span className="text-center text-xs text-[#6b8f6b] sm:text-left sm:text-sm">{health.trend}</span>
            </div>

            <div className="flex w-full flex-col gap-4 px-0 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-1">
              <button
                onClick={() => setLogOpen((prev) => !prev)}
                className="inline-flex items-center justify-center gap-1 self-center rounded-full border border-transparent px-2 py-2 text-sm text-[#476554] underline-offset-2 transition-colors hover:border-[#cadcd1] hover:bg-white/70 hover:text-[#36398e] hover:underline sm:self-auto sm:justify-start sm:py-1"
              >
                Health log
                <ChevronDown className={`h-4 w-4 transition-transform ${logOpen ? "rotate-180" : ""}`} />
              </button>

              <div className="group flex flex-col items-stretch gap-2 rounded-2xl border border-[#cde2cf]/80 bg-gradient-to-r from-white/85 via-[#f3fbf4]/90 to-white/85 px-3 py-3 shadow-[0_8px_24px_rgba(32,98,65,0.12)] backdrop-blur-md transition-all duration-300 sm:flex-row sm:items-center sm:px-3.5 sm:py-2.5 sm:hover:-translate-y-0.5 sm:hover:border-[#b9d8be] sm:hover:shadow-[0_12px_34px_rgba(26,98,70,0.2)]">
                <span className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[#4f745f] sm:text-left">
                  Partners
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <div className="rounded-xl border border-[#d7e6d8] bg-white/95 px-3 py-2 shadow-[0_4px_14px_rgba(19,79,52,0.1)] transition-transform duration-300 sm:px-3.5 sm:group-hover:-translate-y-0.5">
                    <Image src="/AWS.png" alt="AWS" width={140} height={50} className="mx-auto h-8 w-auto object-contain sm:mx-0 sm:h-10" />
                  </div>
                  <div className="rounded-xl border border-[#d7e6d8] bg-white/95 px-3 py-2 shadow-[0_4px_14px_rgba(19,79,52,0.1)] transition-transform duration-300 sm:px-3.5 sm:group-hover:-translate-y-0.5">
                    <Image src="/Syngenta.jpeg" alt="Syngenta" width={168} height={50} className="mx-auto h-8 w-auto object-contain sm:mx-0 sm:h-10" />
                  </div>
                </div>
              </div>
            </div>
          </div>

            {logOpen ? (
              <div className="panel-card rounded-2xl p-4 text-sm text-[#4f6d5b]">
                {logEntries.map((entry) => (
                  <p key={entry.id} className="mb-2 last:mb-0">
                    <span className="mr-2 font-mono text-[#3f5e4b]">{entry.timestamp}</span>
                    {entry.change}
                    <span className="ml-2 font-semibold text-[#11813a]">{entry.delta}</span>
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        </>
      )}
    </header>
  );
}
