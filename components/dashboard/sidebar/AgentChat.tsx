"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Bot, User } from "lucide-react";
import Markdown from "react-markdown";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/lib/types";

interface AgentChatProps {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (message: string) => void;
}

export function AgentChat({ messages, isLoading, onSend }: AgentChatProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="flex flex-col rounded-lg border border-border bg-card overflow-hidden h-full min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <Bot className="h-3.5 w-3.5 text-mars-blue" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          AI Agent
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Bot className="h-8 w-8 text-mars-blue/30 mb-2" />
            <p className="text-xs text-muted-foreground">
              Ask the AI agent about greenhouse status, recommendations, or actions.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: msg.role === "user" ? 12 : -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "flex gap-2",
              msg.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {msg.role === "agent" && (
              <Bot className="h-4 w-4 text-mars-blue shrink-0 mt-1.5" />
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed",
                msg.role === "user" ? "chat-user" : "chat-agent",
              )}
            >
              {msg.role === "agent" ? (
                <Markdown
                  components={{
                    h1: ({ children }) => <h1 className="text-sm font-bold text-mars-green mb-1">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xs font-bold text-mars-green mb-1">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xs font-semibold text-mars-blue mb-0.5">{children}</h3>,
                    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-0.5 my-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-0.5 my-1">{children}</ol>,
                    p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                    code: ({ children }) => <code className="bg-secondary px-1 py-0.5 rounded text-[10px] font-mono">{children}</code>,
                  }}
                >
                  {msg.content}
                </Markdown>
              ) : (
                msg.content
              )}
            </div>
            {msg.role === "user" && (
              <User className="h-4 w-4 text-mars-green shrink-0 mt-1.5" />
            )}
          </motion.div>
        ))}

        {isLoading && (
          <div className="flex gap-2 items-center">
            <Bot className="h-4 w-4 text-mars-blue shrink-0" />
            <div className="flex gap-1 chat-agent rounded-lg px-3 py-2">
              <span className="loading-dot h-1.5 w-1.5 rounded-full bg-mars-blue" />
              <span className="loading-dot h-1.5 w-1.5 rounded-full bg-mars-blue" />
              <span className="loading-dot h-1.5 w-1.5 rounded-full bg-mars-blue" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-border p-2 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the agent..."
            className="flex-1 bg-secondary rounded-md px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mars-green/50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              input.trim() && !isLoading
                ? "bg-mars-green text-mars-navy-deep hover:bg-mars-green/90"
                : "bg-secondary text-muted-foreground",
            )}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
}
