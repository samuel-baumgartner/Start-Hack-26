"use client";

import { useState, useCallback } from "react";
import type { ChatMessage } from "@/lib/types";
import { postAgentQuery } from "@/lib/api";

export function useAgentChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await postAgentQuery(content);
      const agentMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        content: res.response,
        timestamp: res.timestamp,
      };
      setMessages((prev) => [...prev, agentMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "agent",
        content: "Connection to AI agent failed. Check backend status.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { messages, isLoading, sendMessage };
}
