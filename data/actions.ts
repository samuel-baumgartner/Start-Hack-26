import type { ActionItem, MetricBar } from "@/types/greenhouse";

export const statusBars: MetricBar[] = [
  {
    id: "food",
    label: "Food Coverage",
    value: 32,
    color: "mixed",
    statusText: "Critical !",
    statusLevel: "critical",
  },
  {
    id: "water",
    label: "Water Reserve",
    value: 65,
    color: "blue",
    statusText: "20 Days of reserve",
    statusLevel: "healthy",
  },
  {
    id: "battery",
    label: "Battery",
    value: 80,
    color: "amber",
    statusText: "18 Days reserve",
    statusLevel: "warning",
  },
  {
    id: "co2o2",
    label: "CO2/O2 Balance",
    value: 88,
    color: "green",
    statusText: "Stable",
    statusLevel: "healthy",
    unitHint: "Mars atmosphere CO2 enrichment boosts photosynthesis 20-40%",
  },
];

export const actionQueue: ActionItem[] = [
  {
    id: "q1",
    urgency: "critical",
    source: "triage",
    text: "Tier 1 Protect: Route LED priority to Zone A kale/spinach (harvest within 1-2 weeks).",
    timestamp: "Recommended now",
  },
  {
    id: "q2",
    urgency: "critical",
    source: "disease",
    text: "Isolate Zone C nutrient loop and run UV-C sterilization on return line (suspected Pythium risk).",
    timestamp: "2 sols ago",
  },
  {
    id: "q3",
    urgency: "warning",
    source: "triage",
    text: "Tier 2 Hibernate: Drop Zone B canopy temperature by 4C and reduce irrigation 15%.",
    timestamp: "Recommended now",
  },
  {
    id: "q4",
    urgency: "warning",
    source: "nutrition",
    text: "Ion depletion model predicts potassium shortage in Zone C in 5 sols. Pre-load nutrient mix.",
    timestamp: "Scheduled: Sol 249",
  },
  {
    id: "q5",
    urgency: "routine",
    source: "efficiency",
    text: "Tier 3 Sacrifice: Deprioritize new seedlings in Zone D until storm optical depth drops below 2.0.",
    timestamp: "Scheduled: Sol 248",
  },
  {
    id: "q6",
    urgency: "routine",
    source: "efficiency",
    text: "Validate root endoscope feed through 3D-printed channels; brown root scan threshold unchanged.",
    timestamp: "1 sol ago",
  },
];
