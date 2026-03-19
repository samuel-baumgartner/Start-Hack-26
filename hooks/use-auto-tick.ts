"use client";

import { useState, useEffect, useCallback } from "react";
import { getAutoTickStatus, startAutoTick, stopAutoTick } from "@/lib/api";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export function useAutoTick() {
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (USE_MOCK) return;
    getAutoTickStatus()
      .then((s) => setEnabled(s.enabled))
      .catch(() => { /* backend might not be running */ });
  }, []);

  const toggle = useCallback(async () => {
    if (USE_MOCK) {
      setEnabled((prev) => !prev);
      return;
    }
    setIsLoading(true);
    try {
      if (enabled) {
        await stopAutoTick();
        setEnabled(false);
      } else {
        await startAutoTick(5);
        setEnabled(true);
      }
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  return { enabled, isLoading, toggle };
}
