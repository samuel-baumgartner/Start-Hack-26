"use client";

import { useMemo, useState } from "react";
import type { Zone } from "@/types/greenhouse";

export function useZoneNavigation(zones: Zone[]) {
  const [selectedZoneId, setSelectedZoneId] = useState<Zone["id"] | null>(null);

  const selectedZone = useMemo(
    () => zones.find((zone) => zone.id === selectedZoneId) ?? null,
    [selectedZoneId, zones],
  );

  return {
    selectedZone,
    selectedZoneId,
    selectZone: setSelectedZoneId,
    clearZone: () => setSelectedZoneId(null),
  };
}
