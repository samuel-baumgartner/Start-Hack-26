"use client";

import { motion } from "framer-motion";
import type { NutritionData, ChatMessage } from "@/lib/types";
import { AstronautCard } from "./AstronautCard";
import { AgentChat } from "./AgentChat";

interface SidePanelProps {
  nutrition: NutritionData | null;
  chatMessages: ChatMessage[];
  chatLoading: boolean;
  onSendChat: (message: string) => void;
}

export function SidePanel({ nutrition, chatMessages, chatLoading, onSendChat }: SidePanelProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="flex flex-col gap-3 h-full min-h-0"
    >
      {/* Crew Nutrition */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2 px-1">
          Crew Status
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
          {[0, 1, 2, 3].map((i) => (
            <AstronautCard key={i} crewIndex={i} nutrition={nutrition} />
          ))}
        </div>
      </div>

      {/* Agent Chat — fills remaining space */}
      <div className="flex-1 min-h-0 flex flex-col">
        <AgentChat
          messages={chatMessages}
          isLoading={chatLoading}
          onSend={onSendChat}
        />
      </div>
    </motion.aside>
  );
}
