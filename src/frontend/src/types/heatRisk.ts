// Heat-risk domain types — defined locally because backend.d.ts does not yet
// expose HeatRiskArea bindings. These mirror the backend record shape so the
// frontend can talk to the canister via typed casts in useQueries.ts.

import type { HeatRiskLevel, HeatRiskResult } from "../lib/heatRiskEngine";

// Re-export so App.tsx / GlobeScene.tsx can import all heat-risk types from a
// single module.
export type { HeatRiskLevel, HeatRiskResult };

export type HeatRiskAreaId = bigint;

// Mirrors the backend HeatRiskArea record (see backend.d.ts). Note that
// riskScore and recommendedShelters are bigint on the canister side, and
// riskLevel is a free-form string — we narrow it to HeatRiskLevel at the
// call site via the levelFromScore helper / a cast.
export interface HeatRiskArea {
  id: HeatRiskAreaId;
  title: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  riskScore: bigint;
  apparentTemp: number;
  vegetationFactor: number;
  buildingFactor: number;
  communityDensityFactor: number;
  baseTemp: number;
  riskLevel: string;
  recommendedShelters: bigint;
  recommendedGreenArea: number;
  createdAt: bigint;
}

export interface HeatRiskAreaInput {
  title: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  communityDensityFactor?: number;
}

// Shape of the actor methods we cast onto, since backend.d.ts may not yet
// declare them. Keep this in sync with the backend HeatRiskArea record.
// `communityDensityFactor` is `number | null` to match the backend's
// `[] | [number]` opt signature (see backend.d.ts).
export interface HeatRiskActor {
  createHeatRiskArea(
    input: HeatRiskAreaInput,
    riskScore: bigint,
    apparentTemp: number,
    vegetationFactor: number,
    buildingFactor: number,
    baseTemp: number,
    riskLevel: string,
    recommendedShelters: bigint,
    recommendedGreenArea: number,
    communityDensityFactor: number | null,
  ): Promise<HeatRiskAreaId>;
  readHeatRiskArea(id: HeatRiskAreaId): Promise<HeatRiskArea | null>;
  updateHeatRiskArea(
    id: HeatRiskAreaId,
    input: HeatRiskAreaInput,
    riskScore: bigint,
    apparentTemp: number,
    vegetationFactor: number,
    buildingFactor: number,
    baseTemp: number,
    riskLevel: string,
    recommendedShelters: bigint,
    recommendedGreenArea: number,
    communityDensityFactor: number | null,
  ): Promise<void>;
  deleteHeatRiskArea(id: HeatRiskAreaId): Promise<void>;
  listHeatRiskAreas(): Promise<HeatRiskArea[]>;
}
