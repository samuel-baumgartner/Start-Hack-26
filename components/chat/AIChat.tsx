"use client";

import { useMemo, useState } from "react";
import { Send } from "lucide-react";
import { initialChatMessages, rotatingAiReplies } from "@/data/chatMessages";
import type { ChatMessage } from "@/types/greenhouse";

function formatTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function AIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages);
  const [input, setInput] = useState("");
  const [replyIndex, setReplyIndex] = useState(0);
  const [typing, setTyping] = useState(false);

  const canSend = useMemo(() => input.trim().length > 0 && !typing, [input, typing]);
  const visibleMessages = useMemo(() => messages.slice(-3), [messages]);

  function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || typing) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: trimmed,
      time: formatTime(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setTyping(true);

    window.setTimeout(() => {
      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        text: rotatingAiReplies[replyIndex % rotatingAiReplies.length],
        time: formatTime(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setReplyIndex((prev) => prev + 1);
      setTyping(false);
    }, 420);
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl border border-[#d7e6d8] bg-white/70 p-3">
      <div className="mb-2 flex items-center justify-between rounded-xl bg-[#edf4ee] px-2.5 py-1.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#486554]">AI Chat</p>
      </div>

      <div className="mb-2 min-h-0 flex-1 space-y-2 overflow-hidden pr-0.5">
        {visibleMessages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "ai" ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === "ai" ? "bg-[#eef0ff] text-[#28308a]" : "bg-[#e8f6ec] text-[#234934]"
              }`}
            >
              <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold">
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                    msg.role === "ai" ? "bg-[#36398e] text-white" : "bg-[#2a8b4c] text-white"
                  }`}
                >
                  {msg.role === "ai" ? "AI" : "N"}
                </span>
                <span>{msg.role === "ai" ? "NELAN Copilot" : "Nelan"}</span>
                <span className="font-mono opacity-70">{msg.time}</span>
              </div>
              <p>{msg.text}</p>
            </div>
          </div>
        ))}
        {typing ? (
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
              sendMessage();
            }
          }}
          placeholder="Ask NELAN about crop priorities..."
          className="w-full bg-transparent px-2 text-xs text-[#2f4e3d] placeholder:text-[#84a091] focus:outline-none"
        />
        <button
          disabled={!canSend}
          onClick={sendMessage}
          className="rounded-xl bg-[#36398e] p-1.5 text-white transition-colors hover:bg-[#2e3078] disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="Send message"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </section>
  );
}
