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
];

export const rotatingAiReplies = [
  "CO2 is stable at 88%. Pulse enrichment mode compensating for reduced photosynthesis.",
  "Water reserve at 20 days. Reducing irrigation by 15% during the storm extends to 23 days.",
  "Battery at 80%, 18-day reserve. Throttling non-critical lighting saves approximately 4 kW.",
  "Storm optical depth tau = 3.2 - grow lights compensating but energy draw rises approximately 40%.",
  "Nutrient depletion model predicts potassium shortage in Zone C within 5 sols. Pre-loading nutrient mix recommended.",
];
