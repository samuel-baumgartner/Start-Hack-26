export type CropHealth = "healthy" | "harvest-soon" | "mild-stress" | "stressed" | "rapid-grow";

export interface HexCrop {
  id: string;
  emoji: string;
  name: string;
  growthPercent: number;
  harvestSols: number;
  health: CropHealth;
  water: string;
  humidity: string;
  light: string;
  fertilization: string;
  note?: string;
}

export interface ZoneTheme {
  color: string;
  dark: string;
  light: string;
}

export interface HexSlot {
  id: string;
  crop?: HexCrop;
  genericType?: "reserve" | "generic";
}

export interface HexZone {
  id: "A" | "B" | "C" | "D";
  name: string;
  subtitle: string;
  badgeLabel: string;
  badgeTone: "green" | "amber" | "red";
  theme: ZoneTheme;
  slots: HexSlot[];
}

const empty = (zoneId: string, index: number, genericType: "reserve" | "generic" = "generic"): HexSlot => ({
  id: `${zoneId}-slot-${index}`,
  genericType,
});

export const hexZones: HexZone[] = [
  {
    id: "A",
    name: "Caloric base",
    subtitle: "Dwarf wheat & sweet potato",
    badgeLabel: "Stable",
    badgeTone: "green",
    theme: { color: "#009F3C", dark: "#006B28", light: "#E8F5E9" },
    slots: [
      {
        id: "A-wheat",
        crop: {
          id: "wheat",
          emoji: "🌾",
          name: "Dwarf Wheat",
          growthPercent: 55,
          harvestSols: 42,
          health: "healthy",
          water: "OK",
          humidity: "55%",
          light: "Full LED",
          fertilization: "Moderate",
        },
      },
      {
        id: "A-potato",
        crop: {
          id: "sweet-potato",
          emoji: "🍠",
          name: "Sweet Potato",
          growthPercent: 32,
          harvestSols: 56,
          health: "mild-stress",
          water: "Low",
          humidity: "49%",
          light: "Indirect",
          fertilization: "Low",
          note: "Low-gravity irrigation extending hydration retention",
        },
      },
      empty("A", 2),
      empty("A", 3),
      empty("A", 4),
      empty("A", 5),
      empty("A", 6),
    ],
  },
  {
    id: "B",
    name: "Protein & fats",
    subtitle: "Soybean",
    badgeLabel: "Mild stress",
    badgeTone: "amber",
    theme: { color: "#EF9F27", dark: "#B87A1D", light: "#FFF8E1" },
    slots: [
      {
        id: "B-soybean",
        crop: {
          id: "soybean",
          emoji: "🫘",
          name: "Soybean",
          growthPercent: 48,
          harvestSols: 38,
          health: "healthy",
          water: "OK",
          humidity: "52%",
          light: "Full LED",
          fertilization: "Moderate",
        },
      },
      empty("B", 1),
      empty("B", 2),
      empty("B", 3),
      empty("B", 4),
      empty("B", 5),
      empty("B", 6),
    ],
  },
  {
    id: "C",
    name: "Micronutrients",
    subtitle: "Kale, spinach & cherry tomato",
    badgeLabel: "Harvest soon",
    badgeTone: "green",
    theme: { color: "#36398E", dark: "#252770", light: "#EEEDFE" },
    slots: [
      {
        id: "C-kale",
        crop: {
          id: "kale",
          emoji: "🥬",
          name: "Kale",
          growthPercent: 89,
          harvestSols: 5,
          health: "harvest-soon",
          water: "OK",
          humidity: "58%",
          light: "Full LED",
          fertilization: "Moderate",
        },
      },
      {
        id: "C-spinach",
        crop: {
          id: "spinach",
          emoji: "🥬",
          name: "Spinach",
          growthPercent: 95,
          harvestSols: 3,
          health: "harvest-soon",
          water: "OK",
          humidity: "60%",
          light: "Full LED",
          fertilization: "Moderate",
          note: "Ready for harvest - nutrient density at peak",
        },
      },
      {
        id: "C-tomato",
        crop: {
          id: "cherry-tomato",
          emoji: "🍅",
          name: "Cherry Tomato",
          growthPercent: 21,
          harvestSols: 34,
          health: "stressed",
          water: "Low",
          humidity: "44%",
          light: "Supplemental",
          fertilization: "Low",
          note: "Dust storm reduced irradiance below threshold",
        },
      },
      empty("C", 3),
      empty("C", 4),
      empty("C", 5),
      empty("C", 6),
    ],
  },
  {
    id: "D",
    name: "Rapid response",
    subtitle: "Radish & microgreens",
    badgeLabel: "Emergency reserve",
    badgeTone: "red",
    theme: { color: "#E24B4A", dark: "#A32D2D", light: "#FCEBEB" },
    slots: [
      {
        id: "D-radish",
        crop: {
          id: "radish",
          emoji: "🌱",
          name: "Radish",
          growthPercent: 72,
          harvestSols: 4,
          health: "rapid-grow",
          water: "OK",
          humidity: "55%",
          light: "Full LED",
          fertilization: "Moderate",
        },
      },
      {
        id: "D-microgreens",
        crop: {
          id: "microgreens",
          emoji: "🌿",
          name: "Microgreens",
          growthPercent: 58,
          harvestSols: 6,
          health: "rapid-grow",
          water: "OK",
          humidity: "54%",
          light: "Full LED",
          fertilization: "Low",
        },
      },
      empty("D", 2, "reserve"),
      empty("D", 3, "reserve"),
      empty("D", 4, "reserve"),
      empty("D", 5, "reserve"),
      empty("D", 6, "reserve"),
    ],
  },
];

export const sideViewOrder = {
  backRow: [0, 1, 2],
  frontRow: [3, 4, 5, 6],
};
