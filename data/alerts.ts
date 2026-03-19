import type { AlertItem } from "@/types/greenhouse";

export const alerts: AlertItem[] = [
  {
    id: "a1",
    category: "Harvest",
    urgency: "warning",
    text: "Spinach Zone C at 95% - harvest within 2 sols for peak nutrition.",
    timestamp: "Recommended now",
  },
  {
    id: "a2",
    category: "Dust storm",
    urgency: "critical",
    text: "Storm ETA 4 sols - initiating Tier 1/2/3 triage.",
    timestamp: "Recommended now",
  },
  {
    id: "a3",
    category: "Disease",
    urgency: "critical",
    text: "Suspected Pythium in Zone C - isolate nutrient loop and activate UV-C.",
    timestamp: "2 sols ago",
  },
  {
    id: "a4",
    category: "Water",
    urgency: "warning",
    text: "Water reserve below 15-day threshold - reduce irrigation 15%.",
    timestamp: "Scheduled: Sol 249",
  },
  {
    id: "a5",
    category: "Nutrient depletion",
    urgency: "warning",
    text: "Potassium depletion in Zone C predicted within 5 sols - pre-load nutrient mix.",
    timestamp: "Scheduled: Sol 249",
  },
  {
    id: "a6",
    category: "Power",
    urgency: "critical",
    text: "Battery reserve at 12 days - throttle non-critical lighting.",
    timestamp: "Recommended now",
  },
  {
    id: "a7",
    category: "Plant stress",
    urgency: "warning",
    text: "Zone B soybean shows early chlorosis on NIR - check iron levels.",
    timestamp: "1 sol ago",
  },
  {
    id: "a8",
    category: "CO2/O2 balance",
    urgency: "critical",
    text: "CO2 enrichment pump offline - photosynthesis rate dropping.",
    timestamp: "Recommended now",
  },
  {
    id: "a9",
    category: "Temperature",
    urgency: "warning",
    text: "Zone D root temperature at 19C - below germination threshold of 22C.",
    timestamp: "Recommended now",
  },
  {
    id: "a10",
    category: "Emergency reseed",
    urgency: "critical",
    text: "Zone D germination failed - deploying radish microgreens to cover vitamin C gap.",
    timestamp: "Recommended now",
  },
];
