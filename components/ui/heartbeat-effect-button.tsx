"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

interface HeartbeatEffectButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function HeartbeatEffectButton({ children, className = "", ...props }: HeartbeatEffectButtonProps) {
  return (
    <button
      {...props}
      className={`animate-[pulse_1.8s_ease-in-out_infinite] rounded-lg px-4 py-2 font-semibold transition-transform hover:scale-[1.02] ${className}`}
    >
      {children}
    </button>
  );
}
