// Heat-risk computation engine for the TerraFrame heat-risk forecasting tool.
// Pure functions — no I/O, no side effects. Used by App.tsx to compute the
// risk preview when the user picks a center + radius on the globe.

export type HeatRiskLevel = "ต่ำ" | "ปานกลาง" | "สูง" | "วิกฤต";

export interface HeatRiskResult {
  riskScore: number;
  apparentTemp: number;
  riskLevel: HeatRiskLevel;
  recommendedShelters: number;
  recommendedGreenArea: number;
  // Per-factor contributions to the raw score, surfaced so the UI can show a
  // breakdown of what is driving the heat risk for a given area.
  buildingContribution: number;
  vegetationContribution: number;
  communityDensityContribution: number;
}

/**
 * Compute a 0–100 heat-risk score from four factors:
 *  - baseTemp:              ambient temperature in °C (drives baseline risk)
 *  - buildingFactor:        0–1 urban density / impervious surface (amplifies heat)
 *  - vegetationFactor:      0–1 green-space coverage (mitigates heat)
 *  - communityDensityFactor:0–1 dense/slum-community density (amplifies heat)
 *
 * The score blends a temperature baseline with an urban-heat-island delta and
 * a community-density delta, then subtracts a vegetation cooling credit.
 * Result is clamped to [0,100].
 *
 * Signature order: the three 0–1 factors are grouped together
 * (vegetation, building, communityDensity) followed by `baseTemp` so callers
 * read the factor inputs as a single block. `baseTemp` defaults to 35 °C
 * (typical Bangkok summer ambient) so callers that omit it keep working.
 */
export function computeRiskScore(
  latitude: number,
  radiusMeters: number,
  vegetationFactor: number,
  buildingFactor: number,
  communityDensityFactor = 0,
  baseTemp = 35,
): HeatRiskResult {
  // Normalize inputs to safe ranges.
  const veg = clamp01(vegetationFactor);
  const bld = clamp01(buildingFactor);
  const density = clamp01(communityDensityFactor);
  const temp = baseTemp;

  // Temperature baseline: 20°C → 0, 45°C → ~70. Below 20°C the baseline is 0.
  const tempBaseline = Math.max(0, (temp - 20) * (70 / 25));

  // Urban heat island amplification: dense buildings add up to ~25 points.
  const urbanDelta = bld * 25;

  // Community-density amplification: dense/slum communities add up to ~15
  // points — crowded settlements trap heat and lack cooling airflow.
  const communityDensityDelta = density * 15;

  // Vegetation cooling credit: dense canopy removes up to ~20 points.
  const vegCredit = veg * 20;

  // Latitude modifier: equatorial/tropical latitudes (|lat| < 23.5) get a
  // small bonus because solar irradiance is consistently higher.
  const latBonus = Math.abs(latitude) < 23.5 ? 5 : 0;

  const raw =
    tempBaseline + urbanDelta + communityDensityDelta - vegCredit + latBonus;
  const riskScore = Math.round(clamp(raw, 0, 100));

  // Apparent (feels-like) temperature: buildings and density trap heat,
  // vegetation cools.
  const apparentTemp =
    Math.round((temp + bld * 3 + density * 1.5 - veg * 2) * 10) / 10;

  const riskLevel = levelFromScore(riskScore);

  // Recommended cooling shelters: scale with risk and the analysis area.
  // areaKm² = π (r/1000)²; 0.5 shelters per km² at full risk.
  const areaKm2 = Math.PI * (radiusMeters / 1000) ** 2;
  const recommendedShelters = Math.ceil((riskScore / 100) * areaKm2 * 0.5);

  // Recommended green-area coverage as a percentage of the analysis circle.
  // Target 30% canopy; deficit grows as vegetation factor drops.
  const recommendedGreenArea = Math.max(0, 30 - veg * 30);

  return {
    riskScore,
    apparentTemp,
    riskLevel,
    recommendedShelters,
    recommendedGreenArea,
    buildingContribution: urbanDelta,
    vegetationContribution: -vegCredit,
    communityDensityContribution: communityDensityDelta,
  };
}

export function levelFromScore(score: number): HeatRiskLevel {
  if (score <= 25) return "ต่ำ";
  if (score <= 50) return "ปานกลาง";
  if (score <= 75) return "สูง";
  return "วิกฤต";
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
