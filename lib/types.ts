// ── Mars Greenhouse Simulation Types ──
// Mirrors backend Pydantic models exactly

export interface CropStatus {
  name: string;
  growth_stage: string;
  days_planted: number;
  health: number; // 0-100
  biomass_g: number;
  days_to_harvest: number;
}

export interface ZoneEnvironment {
  sol: number;
  is_daytime: boolean;
  external_temp: number;
  solar_irradiance: number;
  dust_opacity: number;
  pressure_kpa: number;
  o2_percent: number;
}

export interface ZoneResources {
  water_reservoir_l: number;
  ph: number;
  ec: number;
  power_generation_kw: number;
  power_consumption_kw: number;
  battery_percent: number;
}

export type ZonePriority = "normal" | "high" | "low" | "hibernate" | "sacrifice";

export interface Zone {
  zone_id: string;
  temperature: number;
  humidity: number;
  co2_ppm: number;
  par_level: number;
  lighting_on: boolean;
  irrigation_rate: number;
  is_quarantined: boolean;
  priority: ZonePriority;
  crops: CropStatus[];
  environment: ZoneEnvironment;
  resources: ZoneResources;
}

export interface SimEnvironment {
  external_temp_c: number;
  solar_irradiance: number;
  dust_opacity_tau: number;
  dust_storm_active: boolean;
  dust_storm_remaining_sols: number;
  disease_active: boolean;
  disease_zone_id: string | null;
  power_failure_active: boolean;
  pressure_kpa: number;
  o2_percent: number;
}

export interface SimResources {
  water_reservoir_l: number;
  water_consumed_today_l: number;
  nutrient_ph: number;
  nutrient_ec: number;
  power_generation_kw: number;
  power_consumption_kw: number;
  battery_charge_kwh: number;
  battery_percent: number;
  solar_panel_efficiency: number;
}

export interface SimState {
  sol: number;
  tick: number;
  total_ticks: number;
  is_daytime: boolean;
  environment: SimEnvironment;
  resources: SimResources;
  zones: Zone[];
  event_log_count: number;
}

export interface NutrientInfo {
  daily_production: number;
  daily_requirement: number;
  coverage_percent: number;
}

export interface NutritionData {
  [nutrient: string]: NutrientInfo | number;
  overall_min_coverage_percent: number;
}

export interface AgentResponse {
  query: string;
  response: string;
  sol: number | null;
  timestamp: string;
}

export interface SSEUpdate {
  sol: number;
  tick: number;
  total_ticks: number;
  is_daytime: boolean;
  dust_storm_active: boolean;
  water_reservoir_l: number;
  battery_percent: number;
  power_generation_kw: number;
  power_consumption_kw: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
}

export interface AutoTickStatus {
  running: boolean;
  interval: number;
}

export interface AgentDecision {
  sol: number;
  tick: number;
  action: string;
  reasoning: string;
  timestamp: string;
}
