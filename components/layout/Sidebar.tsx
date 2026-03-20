"use client";

import { ChevronDown, ChevronUp, MessageSquare } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CrewAvatar } from "@/components/shared/CrewAvatar";
import type { AstronautProfile } from "@/types/greenhouse";

interface SidebarProps {
  alertView: ReactNode;
  teamMembers: AstronautProfile[];
  chatView: ReactNode;
}

export function Sidebar({ alertView, teamMembers, chatView }: SidebarProps) {
  const [isChatOpen, setIsChatOpen] = useState(true);

  return (
    <aside className="glass-card relative flex h-full min-h-[700px] flex-col rounded-3xl p-5">
      <div className="mb-3">
        {alertView}
      </div>

      <section className="mb-3 rounded-2xl border border-[#d7e6d8] bg-white/70 p-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#496856]">Team</h3>
          <span className="text-[11px] text-[#6b8f6b]">{teamMembers.length} crew online</span>
        </div>

        <div className="space-y-2">
          {teamMembers.map((member) => (
            <article key={member.crewId} className="rounded-xl border border-[#e5ece6] bg-white p-2.5">
              <div className="flex items-start gap-2.5">
                <CrewAvatar avatar={member.avatar} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#163126]">{member.name}</p>
                  <p className="text-xs text-[#607f6a]">{member.role}</p>
                  {member.assignedResponsibilities ? (
                    <p className="mt-1 text-[11px] text-[#486554]">
                      Assigned: <span className="text-[#1f3f2d]">{member.assignedResponsibilities}</span>
                      {member.lastActive ? (
                        <>
                          {" · "}
                          <span className="font-medium text-[#1f3f2d]">{member.lastActive}</span>
                        </>
                      ) : null}
                    </p>
                  ) : (
                    <>
                      <p className="mt-1 text-[11px] text-[#486554]">
                        Sol <span className="font-mono text-[#1f3f2d]">{member.sol}</span>
                        {" · "}
                        <span className="font-mono text-[#1f3f2d]">{member.crewId}</span>
                      </p>
                      <p className="truncate text-[11px] text-[#607f6a]">{member.mission}</p>
                    </>
                  )}
                  {member.vitaminDeficiency ? (
                    <p className="mt-1 inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                      Deficiency: {member.vitaminDeficiency}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[#d7e6d8] bg-white/60 p-2">
        <button
          type="button"
          onClick={() => setIsChatOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-xl bg-[#edf4ee] px-3 py-2 text-left transition-colors hover:bg-[#e6f0e8]"
          aria-expanded={isChatOpen}
          aria-controls="ai-chat-panel"
        >
          <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#486554]">
            <MessageSquare className="h-3.5 w-3.5" />
            Flora
          </span>
          {isChatOpen ? (
            <ChevronUp className="h-4 w-4 text-[#486554]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#486554]" />
          )}
        </button>

        {isChatOpen ? (
          <div id="ai-chat-panel" className="mt-2 min-h-[340px] flex-1 overflow-hidden rounded-2xl">
            {chatView}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
