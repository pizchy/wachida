export type LayerId =
  // Base
  | "blank"
  | "terrain"
  | "elevation"
  // Environment
  | "rainfall"
  | "temperature"
  | "humidity"
  | "wind_speed"
  | "sea_level_risk"
  | "wildfire"
  | "deforestation"
  | "soil_quality"
  // Demographics
  | "population"
  | "urban_rural"
  | "median_age"
  | "literacy"
  | "life_expectancy"
  | "internet_access"
  | "bangkok_density"
  // Economy
  | "gdp"
  | "unemployment"
  | "gini"
  | "tourism"
  // Energy & Resources
  | "electricity_access"
  | "renewable_energy"
  | "water_stress"
  | "crop_yield"
  // Health
  | "pollution"
  | "co2"
  | "healthcare"
  | "heat-risk"
  // Satellite
  | "lights"
  | "vegetation"
  | "cloud_cover";

export interface ActiveLayer {
  id: LayerId;
  opacity: number;
}

export interface LayerConfig {
  id: LayerId;
  label: string;
  chipClass: string;
  color: string;
  gradientColors: string[];
  minLabel: string;
  maxLabel: string;
}

export interface LayerCategory {
  id: string;
  label: string;
  layers: LayerConfig[];
}

export type ToolMode =
  | "globe"
  | "pan"
  | "zoom"
  | "measure"
  | "pin"
  | "share"
  | "heat-risk"
  | "temperature";
