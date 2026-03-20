import type { ChatMessage } from "@/types/greenhouse";

export const initialChatMessages: ChatMessage[] = [
  {
    id: "m1",
    role: "ai",
    text: "Good sol, NELAN. Zone D root germination stalled at 19C. Raising to 22C should restart within 2 sols.",
    time: "09:11",
  },
  {
    id: "m2",
    role: "user",
    text: "What about the food coverage?",
    time: "09:12",
  },
  {
    id: "m3",
    role: "ai",
    text: "Food coverage is at 32% - critical. I recommend harvesting Zone A kale and spinach today. That brings coverage to about 58%.",
    time: "09:12",
  },
  {
    id: "m4",
    role: "user",
    text: "What caused Zone D problems?",
    time: "09:13",
  },
  {
    id: "m5",
    role: "ai",
    text: "The Sol 210 dust storm dropped irradiance below 200 umol for 3 consecutive sols. Root germination requires sustained levels above this.",
    time: "09:14",
  },
  {
    id: "m6",
    role: "user",
    text: "Can we recover Zone D without sacrificing Zone B yield?",
    time: "09:15",
  },
  {
    id: "m7",
    role: "ai",
    text: "Yes. Shift 12% light budget from Zone B for the next 36 hours and reduce Zone B transpiration setpoint by 0.2 kPa to hold yield loss under 3%.",
    time: "09:15",
  },
  {
    id: "m8",
    role: "user",
    text: "Any urgent nutrient risks?",
    time: "09:16",
  },
  {
    id: "m9",
    role: "ai",
    text: "Zone C potassium reserve is projected to hit deficiency threshold in 5 sols. Recommend pre-loading a K-heavy mix by end of this sol.",
    time: "09:16",
  },
  {
    id: "m10",
    role: "user",
    text: "What actions should I run in order right now?",
    time: "09:17",
  },
  {
    id: "m11",
    role: "ai",
    text: "Priority sequence: 1) Harvest Zone A kale/spinach, 2) Trigger Tier-1 storm triage, 3) Raise Zone D root temp to 22C, 4) Stage potassium mix for Zone C.",
    time: "09:17",
  },
  {
    id: "m12",
    role: "ai",
    text: "Projected result after execution: food coverage 58%, water reserve +2.7 sols, and Zone D germination recovery window restored within 2 sols.",
    time: "09:18",
  },
];

export const rotatingAiReplies = [
  "CO2 is stable at 88%. Pulse enrichment mode compensating for reduced photosynthesis.",
  "Water reserve at 20 days. Reducing irrigation by 15% during the storm extends to 23 days.",
  "Battery at 80%, 18-day reserve. Throttling non-critical lighting saves approximately 4 kW.",
  "Storm optical depth tau = 3.2 - grow lights compensating but energy draw rises approximately 40%.",
  "Nutrient depletion model predicts potassium shortage in Zone C within 5 sols. Pre-loading nutrient mix recommended.",
];
