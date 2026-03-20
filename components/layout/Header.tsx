"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AlertTriangle, ChevronDown, CircleUserRound } from "lucide-react";
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
}: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);
  const gaugeRadius = 24;
  const gaugeCircumference = 2 * Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCircumference * (1 - Math.max(0, Math.min(100, health.score)) / 100);

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
      className={`glass-card fade-in relative rounded-3xl p-6 transition-all duration-300 ${
        activeAlert ? "ring-2 ring-amber-300/90 shadow-[0_0_0_10px_rgba(252,211,77,0.22)]" : ""
      }`}
    >
      {forcedAlertProposal ? (
        <div className="flex min-h-[166px] items-center justify-between gap-4 rounded-2xl border border-red-300/80 bg-red-50/90 px-5 py-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-700">Alert proposal</p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-red-200 bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-700">
                  {forcedAlertProposal.category}
                </span>
                <span className="font-mono text-xs text-red-600">{forcedAlertProposal.timestamp}</span>
              </div>
              <p className="mt-2 text-base font-medium text-red-800">{forcedAlertProposal.text}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-end pb-1">
            <button
              type="button"
              onClick={onDenyForcedAlert}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50"
            >
              Deny
            </button>
            <HeartbeatEffectButton
              type="button"
              onClick={onAcceptForcedAlert}
              className="bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            >
              Accept
            </HeartbeatEffectButton>
          </div>
        </div>
      ) : activeAlert ? (
        <div className="flex min-h-[166px] items-center gap-4 rounded-2xl border border-amber-300/80 bg-amber-50/85 px-5 py-4 animate-pulse">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-8 w-8" />
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
            <p className="mt-2 text-base font-medium text-[#4f3a1f]">{activeAlert.text}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative h-[60px] w-[60px] shrink-0">
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
                <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-[#1f4e34]">
                  {health.score}%
                </span>
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-[#223929]">Welcome back, NELAN</h1>
                <p className="text-lg text-[#63816f]">Autonomous greenhouse guidance is active.</p>
              </div>
            </div>

            <div className="relative" ref={profileRef}>
              <button
                className="group flex items-center gap-2 rounded-full border border-[#d6e8d8] bg-white/90 px-3 py-2.5 shadow-sm transition-colors hover:bg-white"
                onClick={() => setProfileOpen((prev) => !prev)}
                aria-label="Open astronaut profile"
              >
                <CrewAvatar avatar={profile.avatar} size="md" />
                <CircleUserRound className="h-5 w-5 text-[#52705b] group-hover:text-[#36398e]" />
              </button>

              {profileOpen ? (
                <div className="panel-card absolute right-0 top-14 z-20 w-72 rounded-2xl p-4 text-base">
                  <p className="font-semibold text-[#163126]">{profile.name}</p>
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
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-[#0f7a32]">
                <span>{health.label}</span>
                <span aria-hidden="true">✓</span>
              </span>
              <span className="text-sm text-[#6b8f6b]">{health.trend}</span>
            </div>

            <div className="flex items-end justify-between gap-4">
              <button
                onClick={() => setLogOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 text-sm text-[#476554] underline-offset-2 hover:text-[#36398e] hover:underline"
              >
                Health log
                <ChevronDown className={`h-4 w-4 transition-transform ${logOpen ? "rotate-180" : ""}`} />
              </button>

              <div className="flex items-center gap-2.5">
                <div className="rounded-lg border border-[#d7e6d8] bg-white/85 px-3 py-2">
                  <Image src="/logos/aws-logo.svg" alt="AWS" width={110} height={36} className="h-9 w-auto" />
                </div>
                <div className="rounded-lg border border-[#d7e6d8] bg-white/85 px-3 py-2">
                  <Image
                    src="/logos/syngenta-logo.png"
                    alt="Syngenta"
                    width={154}
                    height={36}
                    className="h-9 w-auto"
                  />
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
