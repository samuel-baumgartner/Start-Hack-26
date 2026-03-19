export type Urgency = "critical" | "warning" | "routine";

export type HealthLevel = "healthy" | "warning" | "critical";

export interface AstronautProfile {
  name: string;
  role: string;
  sol: number;
  crewId: string;
  mission: string;
  initials: string;
  avatar: "male" | "female";
}

export interface HealthLogEntry {
  id: string;
  timestamp: string;
  change: string;
  delta: string;
}

export interface GreenhouseHealth {
  score: number;
  label: string;
  trend: string;
}

export interface MetricBar {
  id: string;
  label: string;
  value: number;
  color: "green" | "blue" | "amber" | "critical" | "mixed";
  statusText: string;
  statusLevel: HealthLevel;
  unitHint?: string;
}

export interface ActionItem {
  id: string;
  urgency: Urgency;
  text: string;
  timestamp: string;
  source: "triage" | "disease" | "nutrition" | "efficiency";
}

export type AlertCategory =
  | "Harvest"
  | "Dust storm"
  | "Disease"
  | "Water"
  | "Nutrient depletion"
  | "Power"
  | "Plant stress"
  | "CO2/O2 balance"
  | "Temperature"
  | "Emergency reseed";

export interface AlertItem {
  id: string;
  category: AlertCategory;
  urgency: Urgency;
  text: string;
  timestamp: string;
}

export interface CropMetric {
  water: "Low" | "OK" | "High";
  humidity: string;
  light: string;
  fertilization: string;
}

export interface Crop {
  id: string;
  name: string;
  icon: string;
  daysToHarvest: number;
  growthPercent: number;
  fvfm: number;
  status: string;
  metrics: CropMetric;
  chlorophyllA?: string;
  chlorophyllB?: string;
  notes?: string;
}

export interface Zone {
  id: "A" | "B" | "C" | "D";
  name: string;
  category: string;
  fill: string;
  border: string;
  health: HealthLevel;
  cropSummary: string;
  crops: Crop[];
}

export interface ChatMessage {
  id: string;
  role: "ai" | "user";
  text: string;
  time: string;
}

export interface WeatherNow {
  temperature: string;
  condition: string;
  alert: string;
  opticalDepthTau: string;
  irradianceLoss: string;
  wind: string;
  pressure: string;
}

export interface ForecastDay {
  sol: string;
  temp: string;
  icon: "dust" | "sun-haze" | "storm";
}

export interface MarsWeather {
  current: WeatherNow;
  forecast: ForecastDay[];
}
