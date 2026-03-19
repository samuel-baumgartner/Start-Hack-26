"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, CircleUserRound } from "lucide-react";
import { ProgressBar } from "@/components/shared/ProgressBar";
import type { AstronautProfile, GreenhouseHealth, HealthLogEntry } from "@/types/greenhouse";

interface HeaderProps {
  profile: AstronautProfile;
  health: GreenhouseHealth;
  logEntries: HealthLogEntry[];
}

export function Header({ profile, health, logEntries }: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement | null>(null);

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
    <header className="glass-card fade-in relative rounded-3xl p-6">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-[#223929]">Welcome back, NELAN</h1>
          <p className="text-lg text-[#63816f]">Autonomous greenhouse guidance is active.</p>
        </div>

        <div className="relative" ref={profileRef}>
          <button
            className="group flex items-center gap-2 rounded-full border border-[#d6e8d8] bg-white/90 px-3 py-2.5 shadow-sm transition-colors hover:bg-white"
            onClick={() => setProfileOpen((prev) => !prev)}
            aria-label="Open astronaut profile"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e0e2f8] text-base font-semibold text-[#36398e]">
              {profile.initials}
            </span>
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

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="min-w-fit text-lg font-medium text-[#32503e]">Greenhouse Health</span>
          <ProgressBar
            value={health.score}
            gradientClass="bg-gradient-to-r from-[#3dbd66] to-[#009f3c]"
            className="h-3.5"
          />
          <span className="font-mono text-xl font-semibold text-[#1f4e34]">{health.score}%</span>
          <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-[#0f7a32]">
            {health.label} ✓
          </span>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setLogOpen((prev) => !prev)}
            className="inline-flex items-center gap-1 text-sm text-[#476554] underline-offset-2 hover:text-[#36398e] hover:underline"
          >
            Health log
            <ChevronDown className={`h-4 w-4 transition-transform ${logOpen ? "rotate-180" : ""}`} />
          </button>
          <span className="text-sm text-[#6b8f6b]">{health.trend}</span>
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
    </header>
  );
}
