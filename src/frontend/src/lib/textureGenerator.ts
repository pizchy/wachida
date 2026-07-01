import type { LayerId } from "../types/globe";

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function hexToRgb(hex: string) {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function sampleGradient(colors: string[], t: number) {
  const n = colors.length - 1;
  const scaled = Math.min(1, Math.max(0, t)) * n;
  const i = Math.min(Math.floor(scaled), n - 1);
  const f = scaled - i;
  const c0 = hexToRgb(colors[i]);
  const c1 = hexToRgb(colors[i + 1]);
  return [
    Math.round(lerp(c0[0], c1[0], f)),
    Math.round(lerp(c0[1], c1[1], f)),
    Math.round(lerp(c0[2], c1[2], f)),
  ];
}

function blendHex(c0: string, c1: string, t: number): [number, number, number] {
  const a = hexToRgb(c0);
  const b = hexToRgb(c1);
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}

// Simple hash-based noise (smooth-ish)
function hash(n: number) {
  const x = Math.sin(n) * 43758.5453;
  return x - Math.floor(x);
}

function noise2d(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  // Smoothstep
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix + iy * 57.0);
  const b = hash(ix + 1 + iy * 57.0);
  const c = hash(ix + (iy + 1) * 57.0);
  const d = hash(ix + 1 + (iy + 1) * 57.0);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy);
}

function fbm(x: number, y: number, seed: number, octaves = 3) {
  let val = 0;
  let amp = 0.5;
  let freq = 0.5;
  for (let i = 0; i < octaves; i++) {
    val +=
      noise2d(
        x * freq * seed * 0.1 + i * 13.7,
        y * freq * seed * 0.1 + i * 7.3,
      ) * amp;
    amp *= 0.5;
    freq *= 2;
  }
  return val;
}

// Land mask: returns 0 (ocean) to 1 (high land)
function landMask(lng: number, lat: number): number {
  // Use low-freq fbm to simulate continental shapes
  const x = Math.cos(lat) * Math.cos(lng);
  const y = Math.cos(lat) * Math.sin(lng);
  const z = Math.sin(lat);
  // Base continents: 3 low-freq octaves
  const base = fbm(x * 2 + y * 1.5, z * 2 + y * 0.8, 3.14, 3);
  return base;
}

const OCEAN_THRESHOLD = 0.42;

// Distance decay from a list of (lat, lng) center points (in radians)
function centerInfluence(
  lat: number,
  lng: number,
  centers: [number, number][],
  radius: number,
): number {
  let maxVal = 0;
  for (const [clat, clng] of centers) {
    const dlat = lat - clat;
    const dlng = lng - clng;
    const dist = Math.sqrt(dlat * dlat + dlng * dlng);
    const val = Math.max(0, 1 - dist / radius);
    if (val > maxVal) maxVal = val;
  }
  return maxVal;
}

// Major economic/population centers [lat_rad, lng_rad]
const DEVELOPED_CENTERS: [number, number][] = [
  [0.873, 0.262], // Europe ~50N 15E
  [0.611, 1.833], // East Asia ~35N 105E
  [0.436, 1.396], // South Asia ~25N 80E
  [0.698, -1.745], // North America ~40N -100W
  [0.087, 0.349], // Africa ~5N 20E
  [0.698, 2.269], // Japan ~40N 130E
  [-0.611, -1.134], // South America ~-35N -65W
];

// Density level for a Bangkok community point.
export type BangkokDensity = "low" | "medium" | "high";

// A slum/dense-community center in Bangkok with Thai name + coordinates +
// density classification. Used by the bangkok_density texture generator
// and the on-globe community markers.
export interface BangkokCommunity {
  name: string;
  lat: number;
  lng: number;
  density: BangkokDensity;
}

// Predefined list of dense communities (ชุมชนแออัด) across Bangkok districts.
// Coordinates are approximate district centroids in decimal degrees.
export const BANGKOK_COMMUNITIES: BangkokCommunity[] = [
  { name: "คลองเตย", lat: 13.7079, lng: 100.5828, density: "high" },
  { name: "สามเสน", lat: 13.7714, lng: 100.5303, density: "high" },
  { name: "บางบอน", lat: 13.6506, lng: 100.4072, density: "medium" },
  { name: "มีนบุรี", lat: 13.8143, lng: 100.7356, density: "medium" },
  { name: "หลักสี่", lat: 13.9167, lng: 100.6042, density: "medium" },
  { name: "ดอนเมือง", lat: 13.9236, lng: 100.5975, density: "low" },
  { name: "ตลิ่งชัน", lat: 13.8047, lng: 100.4094, density: "medium" },
  { name: "บางซื่อ", lat: 13.8042, lng: 100.5364, density: "high" },
  { name: "วังทองหลาง", lat: 13.7789, lng: 100.5953, density: "medium" },
  { name: "ลาดกระบัง", lat: 13.7225, lng: 100.7817, density: "low" },
];

// Map a density level to a display color (matches the legend gradient).
export const BANGKOK_DENSITY_COLORS: Record<BangkokDensity, string> = {
  low: "#4ADE80",
  medium: "#FB923C",
  high: "#EF4444",
};

// Map a density level to a Thai label for popups/legends.
export const BANGKOK_DENSITY_LABELS: Record<BangkokDensity, string> = {
  low: "ต่ำ",
  medium: "ปานกลาง",
  high: "สูง",
};

/**
 * Generates a procedural texture canvas for the given layer.
 * Returns the canvas element directly so callers can use THREE.CanvasTexture.
 */
export function generateLayerCanvas(
  layerId: LayerId,
  width = 1024,
  height = 512,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const nx = px / width; // 0..1
      const ny = py / height; // 0..1
      const lng = (nx - 0.5) * 2 * Math.PI; // -π..π
      const lat = (0.5 - ny) * Math.PI; // π/2..-π/2 (top = north)

      const idx = (py * width + px) * 4;

      let r = 0;
      let g = 0;
      let b = 0;

      const land = landMask(lng, lat);
      const isOcean = land < OCEAN_THRESHOLD;
      const landT = isOcean
        ? 0
        : Math.min(1, (land - OCEAN_THRESHOLD) / (1 - OCEAN_THRESHOLD));
      const absLat = Math.abs(lat);
      const latNorm = absLat / (Math.PI / 2); // 0=equator, 1=pole
      const latN = 1 - latNorm; // 1=equator, 0=pole

      switch (layerId) {
        case "blank": {
          [r, g, b] = blendHex("#1a2035", "#2a3555", Math.random());
          break;
        }

        case "terrain": {
          if (isOcean) {
            const depth = Math.max(
              0,
              (OCEAN_THRESHOLD - land) / OCEAN_THRESHOLD,
            );
            [r, g, b] = blendHex("#0D47A1", "#1565C0", depth);
          } else {
            const elev = landT + fbm(lng * 2, lat * 2, 5.5, 2) * 0.2;
            if (elev < 0.3)
              [r, g, b] = blendHex("#2E7D32", "#388E3C", elev / 0.3);
            else if (elev < 0.6)
              [r, g, b] = blendHex("#388E3C", "#8BC34A", (elev - 0.3) / 0.3);
            else if (elev < 0.8)
              [r, g, b] = blendHex("#8D6E63", "#A5907E", (elev - 0.6) / 0.2);
            else [r, g, b] = blendHex("#BCAAA4", "#ECEFF1", (elev - 0.8) / 0.2);
          }
          break;
        }

        case "elevation": {
          if (isOcean) {
            const depth = Math.max(
              0,
              (OCEAN_THRESHOLD - land) / OCEAN_THRESHOLD,
            );
            [r, g, b] = blendHex("#020B2D", "#0B3D91", 1 - depth);
          } else {
            const elev = landT + fbm(lng * 1.5, lat * 1.5, 7.3, 2) * 0.15;
            if (elev < 0.25)
              [r, g, b] = blendHex("#35C3B2", "#5DE05D", elev / 0.25);
            else if (elev < 0.55)
              [r, g, b] = blendHex("#5DE05D", "#F2C94C", (elev - 0.25) / 0.3);
            else if (elev < 0.8)
              [r, g, b] = blendHex("#F2C94C", "#E25A5A", (elev - 0.55) / 0.25);
            else [r, g, b] = blendHex("#E25A5A", "#FAFAFA", (elev - 0.8) / 0.2);
          }
          break;
        }

        case "temperature": {
          // Lat drives temperature: equator=hot, poles=cold
          const base = latN; // 1=hot at equator, 0=cold at poles
          const noise = fbm(lng * 1.5, lat * 1.5, 5.5, 2) * 0.25 - 0.125;
          const t = Math.min(1, Math.max(0, base + noise));
          [r, g, b] = sampleGradient(
            ["#0B3D91", "#35C3B2", "#F2C94C", "#FF8A3D", "#E25A5A"],
            t,
          ) as [number, number, number];
          break;
        }

        case "rainfall": {
          // Heavy equatorial (ITCZ), dry at ±30° (deserts), moderate mid-lat
          const rainBand =
            Math.exp((-absLat * absLat) / 0.08) * 0.8 + // ITCZ
            Math.max(
              0,
              Math.exp((-(absLat - 0.9) * (absLat - 0.9)) / 0.15) * 0.4,
            ) - // mid-lat
            Math.exp((-(absLat - 0.55) * (absLat - 0.55)) / 0.04) * 0.35; // desert dry
          const noise = fbm(lng * 1.2, lat * 1.2, 3.7, 2) * 0.3;
          const t = Math.min(1, Math.max(0, rainBand + noise));
          [r, g, b] = sampleGradient(
            ["#F0F4FF", "#A8C8FF", "#3A87FF", "#1A5FCC", "#0B3080"],
            t,
          ) as [number, number, number];
          break;
        }

        case "humidity": {
          const hBand =
            Math.exp((-absLat * absLat) / 0.12) * 0.8 +
            Math.max(0, 0.3 - latNorm * 0.2);
          const noise = fbm(lng * 1.0, lat * 1.0, 9.1, 2) * 0.25;
          const t = Math.min(1, Math.max(0, hBand + noise));
          [r, g, b] = sampleGradient(
            ["#FFF8E1", "#B3E5FC", "#67D5FF", "#0288D1", "#01579B"],
            t,
          ) as [number, number, number];
          break;
        }

        case "wind_speed": {
          // Trade winds ~15°, westerlies ~45°, polar ~75°
          const a15 = Math.exp((-(absLat - 0.26) * (absLat - 0.26)) / 0.02);
          const a45 = Math.exp((-(absLat - 0.785) * (absLat - 0.785)) / 0.04);
          const a75 = Math.exp((-(absLat - 1.31) * (absLat - 1.31)) / 0.03);
          const windBase = Math.max(a15, a45, a75);
          const noise = fbm(lng * 1.5, lat * 1.5, 10.3, 2) * 0.3;
          const t = Math.min(1, Math.max(0, windBase * 0.7 + noise));
          [r, g, b] = sampleGradient(
            ["#E0E0E0", "#B0BEC5", "#607D8B", "#37474F", "#1a252c"],
            t,
          ) as [number, number, number];
          break;
        }

        case "sea_level_risk": {
          // Low land near coasts = high risk. Oceans are also high risk zones.
          const coastal = isOcean ? 0.9 : Math.max(0, 1 - landT * 2);
          const noise = fbm(lng * 1.5, lat * 1.5, 11.7, 2) * 0.2;
          const t = Math.min(1, Math.max(0, coastal + noise));
          [r, g, b] = sampleGradient(
            ["#1B5E20", "#C8E6C9", "#00BCD4", "#0097A7", "#006064"],
            t,
          ) as [number, number, number];
          break;
        }

        case "wildfire": {
          // Hot dry zones: lat 20-40° + noise
          const wBand = Math.exp((-(absLat - 0.52) * (absLat - 0.52)) / 0.04);
          const arid = Math.max(
            0,
            1 - Math.exp((-absLat * absLat) / 0.08) * 1.5,
          ); // not equatorial
          const noise = fbm(lng * 1.2, lat * 1.2, 12.2, 2) * 0.3;
          const t = Math.min(1, Math.max(0, wBand * arid * 0.8 + noise * 0.5));
          if (!isOcean) {
            [r, g, b] = sampleGradient(
              ["#FFF9C4", "#FFD54F", "#FF6D00", "#BF360C", "#4E342E"],
              t,
            ) as [number, number, number];
          } else {
            [r, g, b] = blendHex("#0D47A1", "#1565C0", 0.5);
          }
          break;
        }

        case "deforestation": {
          // Tropical belt ±20° with some temperate
          const tropBand = Math.exp((-absLat * absLat) / 0.12);
          const tempBand =
            Math.exp((-(absLat - 0.7) * (absLat - 0.7)) / 0.08) * 0.4;
          const noise = fbm(lng * 1.3, lat * 1.3, 13.5, 2) * 0.3;
          const t = Math.min(
            1,
            Math.max(0, (tropBand + tempBand) * 0.7 + noise),
          );
          if (!isOcean) {
            [r, g, b] = sampleGradient(
              ["#1B5E20", "#388E3C", "#AED581", "#A1887F", "#4E342E"],
              1 - t, // invert: high deforestation = brown
            ) as [number, number, number];
          } else {
            [r, g, b] = blendHex("#0D47A1", "#1565C0", 0.5);
          }
          break;
        }

        case "soil_quality": {
          // Fertile in temperate zones (lat 30-60°)
          const fertile = Math.exp(
            (-(absLat - 0.785) * (absLat - 0.785)) / 0.12,
          );
          const noise = fbm(lng * 1.0, lat * 1.0, 14.1, 2) * 0.3;
          const t = Math.min(1, Math.max(0, fertile * 0.8 + noise));
          if (!isOcean) {
            [r, g, b] = sampleGradient(
              ["#BF360C", "#8D6E63", "#C8A97E", "#4CAF50", "#1B5E20"],
              t,
            ) as [number, number, number];
          } else {
            [r, g, b] = blendHex("#0D47A1", "#1565C0", 0.5);
          }
          break;
        }

        case "population": {
          const influence = centerInfluence(lat, lng, DEVELOPED_CENTERS, 1.2);
          const noise = fbm(lng * 1.5, lat * 1.5, 4.1, 2) * 0.25;
          const t = Math.min(1, Math.max(0, influence * 0.8 + noise));
          if (isOcean) {
            [r, g, b] = blendHex("#0D47A1", "#1565C0", 0.4);
          } else {
            [r, g, b] = sampleGradient(
              ["#FFF0D0", "#FFB347", "#FF8C00", "#FF5C7A", "#8B0000"],
              t,
            ) as [number, number, number];
          }
          break;
        }

        case "bangkok_density": {
          // Render dense-community hotspots across Bangkok. Each community
          // paints a soft radial blob colored by its density level; the
          // surrounding area stays a neutral dark land tone so the spots
          // read clearly. Bangkok sits ~13.75N 100.5E.
          const bangkokLatRad = (13.75 * Math.PI) / 180;
          const bangkokLngRad = (100.5 * Math.PI) / 180;
          // Base land tone for the Bangkok region (subtle warm dark).
          [r, g, b] = isOcean
            ? blendHex("#0D47A1", "#1565C0", 0.4)
            : blendHex("#1a2035", "#2a3555", 0.5);

          // Influence radius in radians (~0.5° ≈ 55 km, but we use a tighter
          // spot radius so individual communities are visible).
          const spotRadius = 0.012;
          let maxInfluence = 0;
          let activeDensity: BangkokDensity | null = null;
          for (const c of BANGKOK_COMMUNITIES) {
            const clat = (c.lat * Math.PI) / 180;
            const clng = (c.lng * Math.PI) / 180;
            const dlat = lat - clat;
            const dlng = lng - clng;
            const dist = Math.sqrt(dlat * dlat + dlng * dlng);
            const inf = Math.max(0, 1 - dist / spotRadius);
            if (inf > maxInfluence) {
              maxInfluence = inf;
              activeDensity = c.density;
            }
          }

          if (maxInfluence > 0 && activeDensity) {
            const spotColor = hexToRgb(BANGKOK_DENSITY_COLORS[activeDensity]);
            // Soft falloff: center fully colored, edges blend back to land.
            const blend = maxInfluence;
            r = Math.round(lerp(r, spotColor[0], blend));
            g = Math.round(lerp(g, spotColor[1], blend));
            b = Math.round(lerp(b, spotColor[2], blend));
          }

          // Subtle Bangkok-region halo so the cluster is locatable even
          // between spots.
          const halo = centerInfluence(
            lat,
            lng,
            [[bangkokLatRad, bangkokLngRad]],
            0.06,
          );
          if (halo > 0 && !isOcean) {
            const haloColor = hexToRgb("#3a2a4a");
            r = Math.round(lerp(r, haloColor[0], halo * 0.4));
            g = Math.round(lerp(g, haloColor[1], halo * 0.4));
            b = Math.round(lerp(b, haloColor[2], halo * 0.4));
          }
          break;
        }

        case "urban_rural": {
          const influence = centerInfluence(lat, lng, DEVELOPED_CENTERS, 0.8);
          const noise = fbm(lng * 2.0, lat * 2.0, 15.6, 2) * 0.3;
          const t = Math.min(1, Math.max(0, influence * 0.7 + noise));
          if (isOcean) {
            [r, g, b] = blendHex("#0D47A1", "#1565C0", 0.4);
          } else {
            [r, g, b] = sampleGradient(
              ["#E8F5E9", "#A5D6A7", "#AB47BC", "#6A1B9A", "#1A0030"],
              t,
            ) as [number, number, number];
          }
          break;
        }

        case "median_age": {
          // Higher in developed/temperate regions
          const dev = centerInfluence(
            lat,
            lng,
            [
              [0.873, 0.262], // Europe
              [0.611, 1.833], // East Asia
              [0.698, -1.745], // N America
            ],
            1.0,
          );
          const noise = fbm(lng * 1.0, lat * 1.0, 16.2, 2) * 0.2;
          const t = Math.min(1, Math.max(0, dev * 0.7 + noise));
          [r, g, b] = sampleGradient(
            ["#F3E5F5", "#F48FB1", "#E91E63", "#880E4F", "#2D0016"],
            t,
          ) as [number, number, number];
          break;
        }

        case "literacy": {
          const temperate = Math.exp(
            (-(absLat - 0.785) * (absLat - 0.785)) / 0.25,
          );
          const dev =
            centerInfluence(lat, lng, DEVELOPED_CENTERS.slice(0, 4), 1.2) * 0.4;
          const noise = fbm(lng * 1.0, lat * 1.0, 17.8, 2) * 0.25;
          const t = Math.min(1, Math.max(0, temperate * 0.5 + dev + noise));
          [r, g, b] = sampleGradient(
            ["#880E4F", "#E91E63", "#FFB300", "#26A69A", "#004D40"],
            t,
          ) as [number, number, number];
          break;
        }

        case "life_expectancy": {
          const dev = centerInfluence(
            lat,
            lng,
            DEVELOPED_CENTERS.slice(0, 4),
            1.3,
          );
          const tropicalPenalty = Math.exp((-absLat * absLat) / 0.15) * 0.2;
          const noise = fbm(lng * 1.0, lat * 1.0, 18.4, 2) * 0.2;
          const t = Math.min(
            1,
            Math.max(0, dev * 0.6 - tropicalPenalty + noise + 0.2),
          );
          [r, g, b] = sampleGradient(
            ["#B71C1C", "#FF5722", "#FFC107", "#00C853", "#1B5E20"],
            t,
          ) as [number, number, number];
          break;
        }

        case "internet_access": {
          const dev = centerInfluence(lat, lng, DEVELOPED_CENTERS, 1.1);
          const latBoost = Math.max(0, 1 - latNorm * 0.8) * 0.2;
          const noise = fbm(lng * 1.2, lat * 1.2, 19.9, 2) * 0.25;
          const t = Math.min(1, Math.max(0, dev * 0.7 + latBoost + noise));
          [r, g, b] = sampleGradient(
            ["#1A0A3D", "#3A0CA3", "#4361EE", "#00B0FF", "#E0F7FA"],
            t,
          ) as [number, number, number];
          break;
        }

        case "gdp": {
          const econCenters: [number, number][] = [
            [0.873, 0.262], // Europe
            [0.611, 1.833], // East Asia
            [0.698, -1.745], // N America
            [0.698, 2.269], // Japan
          ];
          const dev = centerInfluence(lat, lng, econCenters, 1.0);
          const noise = fbm(lng * 1.0, lat * 1.0, 7.8, 2) * 0.2;
          const t = Math.min(1, Math.max(0, dev * 0.8 + noise));
          if (isOcean) {
            [r, g, b] = blendHex("#0D47A1", "#1565C0", 0.3);
          } else {
            [r, g, b] = sampleGradient(
              ["#1A2B0A", "#2E5C1A", "#38B56A", "#C8E63A", "#F2C94C"],
              t,
            ) as [number, number, number];
          }
          break;
        }

        case "unemployment": {
          const noise = fbm(lng * 1.2, lat * 1.2, 20.3, 2) * 0.6 + 0.2;
          const t = Math.min(1, Math.max(0, noise));
          [r, g, b] = sampleGradient(
            ["#E8F5E9", "#A5D6A7", "#FFB300", "#FF7043", "#B71C1C"],
            t,
          ) as [number, number, number];
          break;
        }

        case "gini": {
          const noise = fbm(lng * 1.0, lat * 1.0, 21.7, 2) * 0.7 + 0.15;
          const t = Math.min(1, Math.max(0, noise));
          [r, g, b] = sampleGradient(
            ["#004D40", "#00897B", "#F9A825", "#CE93D8", "#4A148C"],
            t,
          ) as [number, number, number];
          break;
        }

        case "tourism": {
          // Coast + temperate zones
          const coastal = isOcean ? 0 : Math.max(0, 1 - landT * 3) * 0.5;
          const temperate =
            Math.exp((-(absLat - 0.7) * (absLat - 0.7)) / 0.25) * 0.4;
          const noise = fbm(lng * 1.5, lat * 1.5, 22.1, 2) * 0.3;
          const t = Math.min(1, Math.max(0, coastal + temperate + noise));
          if (isOcean) {
            [r, g, b] = blendHex("#0D47A1", "#1565C0", 0.4);
          } else {
            [r, g, b] = sampleGradient(
              ["#1A237E", "#3949AB", "#7986CB", "#FFD54F", "#FF6F00"],
              t,
            ) as [number, number, number];
          }
          break;
        }

        case "electricity_access": {
          const dev = centerInfluence(lat, lng, DEVELOPED_CENTERS, 1.1);
          const noise = fbm(lng * 1.0, lat * 1.0, 23.5, 2) * 0.25;
          const t = Math.min(1, Math.max(0, dev * 0.75 + noise));
          [r, g, b] = sampleGradient(
            ["#212121", "#424242", "#FFF176", "#FFEE58", "#F57F17"],
            t,
          ) as [number, number, number];
          break;
        }

        case "renewable_energy": {
          const noise = fbm(lng * 1.2, lat * 1.2, 24.8, 2) * 0.7 + 0.15;
          const t = Math.min(1, Math.max(0, noise));
          [r, g, b] = sampleGradient(
            ["#4E342E", "#8D6E63", "#AED581", "#69F0AE", "#00BFA5"],
            t,
          ) as [number, number, number];
          break;
        }

        case "water_stress": {
          // Dry zones lat 20-35° = high stress
          const dryBand = Math.exp((-(absLat - 0.48) * (absLat - 0.48)) / 0.04);
          const polar =
            Math.exp((-(absLat - Math.PI / 2) * (absLat - Math.PI / 2)) / 0.1) *
            0.3;
          const noise = fbm(lng * 1.2, lat * 1.2, 25.3, 2) * 0.25;
          const t = Math.min(1, Math.max(0, dryBand * 0.7 + polar + noise));
          if (isOcean) {
            [r, g, b] = blendHex("#0D47A1", "#1565C0", 0.4);
          } else {
            [r, g, b] = sampleGradient(
              ["#0D47A1", "#29B6F6", "#B3E5FC", "#FFCC02", "#BF360C"],
              t,
            ) as [number, number, number];
          }
          break;
        }

        case "crop_yield": {
          // Fertile temperate 30-60°
          const temperate = Math.exp(
            (-(absLat - 0.785) * (absLat - 0.785)) / 0.2,
          );
          const polarPenalty = latNorm > 0.85 ? (latNorm - 0.85) * 4 : 0;
          const tropicalPenalty = latN > 0.9 ? (latN - 0.9) * 4 : 0;
          const noise = fbm(lng * 1.0, lat * 1.0, 26.6, 2) * 0.25;
          const t = Math.min(
            1,
            Math.max(
              0,
              temperate * 0.8 + noise - polarPenalty - tropicalPenalty,
            ),
          );
          if (isOcean) {
            [r, g, b] = blendHex("#0D47A1", "#1565C0", 0.4);
          } else {
            [r, g, b] = sampleGradient(
              ["#5D4037", "#8D6E63", "#C8A97E", "#C6E422", "#33691E"],
              t,
            ) as [number, number, number];
          }
          break;
        }

        case "pollution": {
          const dev = centerInfluence(lat, lng, DEVELOPED_CENTERS, 0.9);
          const noise = fbm(lng * 1.5, lat * 1.5, 6.2, 2) * 0.3;
          const t = Math.min(1, Math.max(0, dev * 0.7 + noise));
          if (isOcean) {
            [r, g, b] = blendHex("#0D47A1", "#1565C0", 0.3);
          } else {
            [r, g, b] = sampleGradient(
              ["#1A0A3D", "#5B3099", "#8B6CFF", "#C084FC", "#F5D0FE"],
              t,
            ) as [number, number, number];
          }
          break;
        }

        case "co2": {
          const dev = centerInfluence(lat, lng, DEVELOPED_CENTERS, 1.0);
          const noise = fbm(lng * 1.2, lat * 1.2, 27.9, 2) * 0.25;
          const t = Math.min(1, Math.max(0, dev * 0.7 + noise));
          [r, g, b] = sampleGradient(
            ["#E8F5E9", "#A5D6A7", "#78909C", "#455A64", "#263238"],
            t,
          ) as [number, number, number];
          break;
        }

        case "healthcare": {
          const dev = centerInfluence(
            lat,
            lng,
            DEVELOPED_CENTERS.slice(0, 4),
            1.1,
          );
          const noise = fbm(lng * 1.0, lat * 1.0, 28.4, 2) * 0.25;
          const t = Math.min(1, Math.max(0, dev * 0.7 + noise + 0.1));
          [r, g, b] = sampleGradient(
            ["#B71C1C", "#E57373", "#EF9A9A", "#F8BBD0", "#FAFAFA"],
            t,
          ) as [number, number, number];
          break;
        }

        case "vegetation": {
          // Tropical = high, desert belts (±25°) = low, temperate = moderate
          const tropical = Math.exp((-absLat * absLat) / 0.12) * 0.8;
          const desertDip =
            Math.exp((-(absLat - 0.44) * (absLat - 0.44)) / 0.02) * 0.5;
          const noise = fbm(lng * 1.3, lat * 1.3, 29.7, 2) * 0.25;
          const t = Math.min(
            1,
            Math.max(0, tropical - desertDip + noise + 0.1),
          );
          if (isOcean) {
            [r, g, b] = blendHex("#0D47A1", "#1565C0", 0.4);
          } else {
            [r, g, b] = sampleGradient(
              ["#5D4037", "#BF360C", "#F9A825", "#76FF03", "#1B5E20"],
              t,
            ) as [number, number, number];
          }
          break;
        }

        case "cloud_cover": {
          // ITCZ at equator = heavy, subtropics = clear, mid-lat = moderate
          const itcz = Math.exp((-absLat * absLat) / 0.08) * 0.8;
          const subtropical =
            Math.exp((-(absLat - 0.44) * (absLat - 0.44)) / 0.02) * -0.4;
          const midlat =
            Math.exp((-(absLat - 0.87) * (absLat - 0.87)) / 0.08) * 0.4;
          const noise = fbm(lng * 2.0, lat * 2.0, 30.2, 3) * 0.3;
          const t = Math.min(
            1,
            Math.max(0, itcz + subtropical + midlat + noise + 0.2),
          );
          [r, g, b] = sampleGradient(
            ["#1565C0", "#64B5F6", "#B3E5FC", "#E0E0E0", "#FAFAFA"],
            t,
          ) as [number, number, number];
          break;
        }

        case "lights": {
          // Cluster near population centers, very sparse elsewhere
          const influence = centerInfluence(lat, lng, DEVELOPED_CENTERS, 0.8);
          const spotNoise =
            noise2d(lng * 8 + 100, lat * 8 + 100) > 0.7
              ? noise2d(lng * 8 + 100, lat * 8 + 100) * influence * 1.5
              : 0;
          const base = influence * 0.6;
          const t = Math.min(1, Math.max(0, isOcean ? 0 : base + spotNoise));
          [r, g, b] = sampleGradient(
            ["#050709", "#1A1A2E", "#7B61FF", "#F2C94C", "#FFFDE7"],
            t,
          ) as [number, number, number];
          break;
        }

        case "heat-risk": {
          // Urban heat-island heatmap. Combines a latitude/solar baseline
          // (tropics hotter) with population-center influence (urban density)
          // and vegetation noise (cool spots). Mapped onto the 4-level
          // green→yellow→orange→deep-red severity gradient.
          const solar = Math.exp((-absLat * absLat) / 0.18) * 0.55; // tropics
          const urban =
            centerInfluence(lat, lng, DEVELOPED_CENTERS, 0.9) * 0.45;
          // Vegetation cools: invert the vegetation noise field.
          const vegNoise = fbm(lng * 1.3, lat * 1.3, 29.7, 2) * 0.25;
          const cooling = vegNoise * 0.35;
          const detail = fbm(lng * 2.4, lat * 2.4, 31.5, 3) * 0.2;
          const t = Math.min(
            1,
            Math.max(0, solar + urban - cooling + detail + 0.05),
          );
          if (isOcean) {
            // Oceans stay cool/neutral so the heatmap reads as a land signal.
            [r, g, b] = blendHex("#0D2A4D", "#1565C0", 0.4);
          } else {
            [r, g, b] = sampleGradient(
              ["#2E7D32", "#F2C94C", "#FF8A3D", "#B71C1C"],
              t,
            ) as [number, number, number];
          }
          break;
        }

        default: {
          [r, g, b] = [30, 40, 60];
        }
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** @deprecated Use generateLayerCanvas instead */
export function generateLayerTexture(layerId: LayerId, size = 1024): string {
  return generateLayerCanvas(layerId, size, size / 2).toDataURL();
}
