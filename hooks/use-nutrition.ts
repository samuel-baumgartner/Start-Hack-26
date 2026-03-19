"use client";

import { useState, useEffect, useRef } from "react";
import type { NutritionData } from "@/lib/types";
import { getSimNutrition } from "@/lib/api";
import { MOCK_NUTRITION } from "@/lib/mock-data";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export function useNutrition(totalTicks?: number) {
  const [nutrition, setNutrition] = useState<NutritionData | null>(USE_MOCK ? MOCK_NUTRITION : null);
  const [isLoading, setIsLoading] = useState(!USE_MOCK);
  const lastTickRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (USE_MOCK) return;
    if (totalTicks !== undefined && totalTicks === lastTickRef.current) return;
    lastTickRef.current = totalTicks;

    let cancelled = false;
    getSimNutrition()
      .then((data) => {
        if (!cancelled) setNutrition(data);
      })
      .catch(() => { /* silent — nutrition is supplemental */ })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [totalTicks]);

  return { nutrition, isLoading };
}
