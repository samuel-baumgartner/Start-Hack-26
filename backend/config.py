# Mission
CREW_SIZE = 4
MISSION_DURATION_SOLS = 450
GROWING_AREA_M2 = 200  # NASA ALS: ~50 m²/person × 4 crew (NASA/CR-2004-208941)

# Mars environment
MARS_GRAVITY = 3.72  # m/s²
MARS_SOLAR_IRRADIANCE_MAX = 590  # W/m²
MARS_SOL_LENGTH_HOURS = 24.62
MARS_ATMO_CO2_PERCENT = 95.3
MARS_SURFACE_TEMP_AVG = -60  # °C
MARS_COMMS_DELAY_MIN = 4  # minutes one-way
MARS_COMMS_DELAY_MAX = 24

# Greenhouse
GREENHOUSE_TEMP_TARGET = 22  # °C
GREENHOUSE_HUMIDITY_TARGET = 65  # % — mid-range of Syngenta 50-70%
GREENHOUSE_CO2_TARGET = 1000  # ppm — mid-range of Syngenta 800-1200
GREENHOUSE_PRESSURE = 101.3  # kPa
GREENHOUSE_PHOTOPERIOD_HOURS = 18
GREENHOUSE_PAR_TARGET = 300  # µmol/m²/s — between Syngenta leafy (200) and fruiting (450)
GREENHOUSE_WATER_BUDGET_L = 1500  # scaled for 200 m² growing area
GREENHOUSE_WATER_RECYCLE_EFFICIENCY = 0.98  # NASA target for Mars
GREENHOUSE_POWER_BUDGET_KW = 20

# Nutrition (per astronaut per day, NASA JSC-67378)
DAILY_CALORIES_KCAL = 2800
DAILY_PROTEIN_G = 60  # greenhouse target — remainder supplemented from Earth stores
DAILY_FAT_G = 93  # ~30% of 2800 kcal (Earth-supplied)
DAILY_FIBER_G = 25
DAILY_VITAMIN_C_MG = 90
DAILY_VITAMIN_K_UG = 120
DAILY_FOLATE_UG = 400
DAILY_CALCIUM_MG = 1200  # higher for spaceflight
DAILY_IRON_MG = 8
DAILY_POTASSIUM_MG = 3400
DAILY_VITAMIN_A_UG_RAE = 900

# Simulation
SIMULATION_TICK_HOURS = 6  # agent runs every 6 simulated hours
DUST_STORM_PROBABILITY_PER_SOL = 0.005
DISEASE_PROBABILITY_PER_SOL = 0.002
POWER_FAILURE_PROBABILITY_PER_SOL = 0.001

# Disease progression (1 tick = 6 simulated hours)
DISEASE_INCUBATION_TICKS = {"pythium_root_rot": 3, "powdery_mildew": 4, "bacterial_wilt": 2}
DISEASE_DAMAGE_SYMPTOMATIC = {"pythium_root_rot": 5.0, "powdery_mildew": 3.0, "bacterial_wilt": 8.0}
DISEASE_DAMAGE_CRITICAL = {"pythium_root_rot": 10.0, "powdery_mildew": 5.0, "bacterial_wilt": 15.0}
DISEASE_WATER_SPREAD_RATE = {"pythium_root_rot": 0.3, "powdery_mildew": 0.0, "bacterial_wilt": 0.1}
DISEASE_SPREAD_THRESHOLD = 0.3
DISEASE_SPREAD_CHANCE_PER_TICK = 0.15

# Treatment costs
UVC_POWER_COST_KW = 2.0
H2O2_EC_INCREASE = 0.5

# Sensor noise parameters
SENSOR_TEMP_NOISE_STD = 0.5  # °C
SENSOR_HUMIDITY_NOISE_STD = 2.0  # %
SENSOR_CO2_NOISE_STD = 20.0  # ppm
SENSOR_PAR_NOISE_STD = 10.0  # µmol/m²/s
SENSOR_PH_NOISE_STD = 0.1
SENSOR_EC_NOISE_STD = 0.05  # mS/cm
SENSOR_FAILURE_PROBABILITY = 0.02  # per reading
SENSOR_STALENESS_MAX_TICKS = 2

# Indirect disease indicator noise (research-calibrated)
SENSOR_LEAF_COLOR_NOISE_STD = 3.0       # NDVI-scale ×100; NDVI variance ±0.03 typical
SENSOR_GROWTH_ANOMALY_NOISE_STD = 5.0   # % points; matches biomass measurement uncertainty
SENSOR_WATER_QUALITY_NOISE_STD = 0.02   # 0-1 scale; inline turbidity sensors ±2% accuracy

# Zone configuration
NUM_ZONES = 4
ZONE_AREA_M2 = GROWING_AREA_M2 / NUM_ZONES  # 50 m² default (zones have variable sizes)

# Power subsystem defaults (kW) — NASA-calibrated values
POWER_LIGHTING_PER_ZONE_KW = 3.5  # ~70 W/m² × 50 m² zone for food-crop PAR levels
POWER_HEATING_KW = 3.0  # active heating against −60 °C ambient
POWER_HEATING_STANDBY_KW = 0.8  # standby when all zones above 20 °C
POWER_PUMPS_KW = 1.0  # aeroponic high-pressure pumps
POWER_MONITORING_KW = 0.5  # sensors + comms
POWER_LIFE_SUPPORT_KW = 4.0  # ECLSS: ~1.0 kW/person × 4

# Solar panels
SOLAR_PANEL_AREA_M2 = 120.0  # m² of deployed panels

# Nuclear power
NUCLEAR_BASELINE_KW = 15.0  # NASA Kilopower: 1.5 units × 10 kW

# Battery — sized for load smoothing, not overnight survival
BATTERY_CAPACITY_KWH = 500.0  # Mars habitat scale
BATTERY_INITIAL_CHARGE = 0.80  # 80%

# Brownout thresholds (% of battery capacity)
BROWNOUT_TIER1_PERCENT = 20.0  # shed sacrifice/low priority zone lights
BROWNOUT_TIER2_PERCENT = 10.0  # shed all except high priority
BROWNOUT_TIER3_PERCENT = 5.0   # shed everything — emergency mode
BROWNOUT_HYSTERESIS = 5.0      # restore threshold offset above trigger

# Crew health
CREW_HEALTH_DECAY_PER_TICK = 0.5   # max hp loss per tick at 0% food coverage
CREW_HEALTH_RECOVERY_PER_TICK = 0.1  # slow recovery when well-fed
