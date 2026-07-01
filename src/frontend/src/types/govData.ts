// Government data domain types — defined locally because backend.d.ts does
// not yet expose GovDataPoint / GovDataResponse bindings. These mirror the
// backend record shape (see contracts.backendTypes in the dispatch) so the
// frontend can talk to the canister via typed casts in useQueries.ts.
//
// NOTE: `fetchedAt` is `Int` (Time.Time in nanoseconds) on the backend, so we
// map it to `bigint` here — the same convention used for `createdAt` /
// `riskScore` / `recommendedShelters` in types/heatRisk.ts.

// A single government data observation: a geolocated measurement with a
// human-readable label and the source agency that produced it. Mirrors the
// backend `GovDataPoint` record.
export interface GovDataPoint {
  lat: number;
  lng: number;
  value: number;
  label: string;
  source: string;
}

// Envelope returned by the backend gov-data query. `success` is false when
// the upstream government endpoint is unreachable or not yet wired; in that
// case `points` is empty, `error` carries a short message, and callers should
// fall back to GOV_DATA_FALLBACK below. `fetchedAt` is the nanosecond
// timestamp of the (attempted) fetch.
export interface GovDataResponse {
  success: boolean;
  points: GovDataPoint[];
  source: string;
  fetchedAt: bigint;
  error: string;
}

// Shape of the actor method we cast onto, since backend.d.ts may not yet
// declare the gov-data query. Keep this in sync with the backend
// GovDataResponse record.
export interface GovDataActor {
  fetchGovData(q: string): Promise<GovDataResponse>;
}

// ---------------------------------------------------------------------------
// Fallback data
// ---------------------------------------------------------------------------

// Predefined fallback government data points for the Bangkok region. Used by
// the frontend when the backend returns `success: false` (no real government
// endpoint wired yet) — same pattern as BANGKOK_COMMUNITIES in
// lib/textureGenerator.ts. Values are illustrative heat/temperature readings
// in degrees Celsius; `source` names the agency that would normally provide
// the reading. Coordinates are approximate district centroids in decimal
// degrees.
export const GOV_DATA_FALLBACK: GovDataPoint[] = [
  {
    lat: 13.7563,
    lng: 100.5018,
    value: 38.4,
    label: "อุณหภูมิย่านพาหุรัด",
    source: "กรมอุตุนิยมวิทยา",
  },
  {
    lat: 13.7079,
    lng: 100.5828,
    value: 37.9,
    label: "อุณหภูมิย่านคลองเตย",
    source: "กรมอุตุนิยมวิทยา",
  },
  {
    lat: 13.7714,
    lng: 100.5303,
    value: 39.1,
    label: "อุณหภูมิย่านสามเสน",
    source: "กรมอุตุนิยมวิทยา",
  },
  {
    lat: 13.6506,
    lng: 100.4072,
    value: 36.8,
    label: "อุณหภูมิย่านบางบอน",
    source: "กรมอุตุนิยมวิทยา",
  },
  {
    lat: 13.8143,
    lng: 100.7356,
    value: 37.2,
    label: "อุณหภูมิย่านมีนบุรี",
    source: "กรมอุตุนิยมวิทยา",
  },
  {
    lat: 13.7225,
    lng: 100.7817,
    value: 36.5,
    label: "อุณหภูมิย่านลาดกระบัง",
    source: "กรมอุตุนิยมวิทยา",
  },
];

// A synthetic GovDataResponse built from GOV_DATA_FALLBACK, for callers that
// need the envelope shape rather than the raw points. `fetchedAt` is 0n
// because this fallback was never actually fetched from a backend.
export const GOV_DATA_FALLBACK_RESPONSE: GovDataResponse = {
  success: false,
  points: GOV_DATA_FALLBACK,
  source: "mock",
  fetchedAt: 0n,
  error: "ยังไม่ได้เชื่อมต่อ endpoint ของรัฐบาล — ใช้ข้อมูลตัวอย่าง",
};
