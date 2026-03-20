"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useAgentChat } from "@/hooks/use-agent-chat";

function formatTime(isoTimestamp: string) {
  const time = new Date(isoTimestamp);
  return `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;
}

export function AIChat() {
  const { messages, isLoading, sendMessage } = useAgentChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading]);
  const visibleMessages = useMemo(() => messages, [messages]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visibleMessages.length, isLoading]);

  function handleSendMessage() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    void sendMessage(trimmed);
    setInput("");
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-[#d7e6d8] bg-white/70 p-3">
      <div ref={scrollRef} className="custom-scrollbar mb-2 min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
        {visibleMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "agent" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === "agent" ? "bg-[#eef0ff] text-[#28308a]" : "bg-[#e8f6ec] text-[#234934]"
              }`}
            >
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                    msg.role === "agent" ? "bg-[#36398e] text-white" : "bg-[#2a8b4c] text-white"
                  }`}
                >
                  {msg.role === "agent" ? "AI" : "N"}
                </span>
                <span>{msg.role === "agent" ? "Flora" : "Nelan"}</span>
                <span className="font-mono opacity-70">{formatTime(msg.timestamp)}</span>
              </div>
              <p>{msg.content}</p>
            </div>
          </div>
        ))}
        {isLoading ? (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-[#eef0ff] px-3 py-2 text-xs text-[#28308a]">AI is composing...</div>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-[#d7e6d8] bg-white p-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Ask Flora about crop priorities..."
          className="w-full bg-transparent px-2 text-xs text-[#2f4e3d] placeholder:text-[#84a091] focus:outline-none"
        />
        <button
          disabled={!canSend}
          onClick={handleSendMessage}
          className="rounded-xl bg-[#36398e] p-1.5 text-white transition-colors hover:bg-[#2e3078] disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="Send message"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}
