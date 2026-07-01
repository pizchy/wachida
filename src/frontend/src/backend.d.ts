import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export type Time = bigint;
export interface PinInput {
    latitude: number;
    title: string;
    description: string;
    longitude: number;
}
export interface HttpRequestResult {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export interface GovDataResponse {
    fetchedAt: bigint;
    source: string;
    error: string;
    success: boolean;
    points: Array<GovDataPoint>;
}
export interface GovDataPoint {
    lat: number;
    lng: number;
    value: number;
    source: string;
    name: string;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface BBox {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
}
export interface HttpHeader {
    value: string;
    name: string;
}
export interface HeatRiskAreaInput {
    communityDensityFactor?: number;
    latitude: number;
    title: string;
    longitude: number;
    radiusMeters: number;
}
export interface Pin {
    id: PinId;
    latitude: number;
    title: string;
    createdAt: Time;
    description: string;
    longitude: number;
}
export type Result = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export interface WildfireResponse {
    fires: Array<WildfirePoint>;
}
export interface GeocodeResult {
    rawJson: string;
    results: Array<GeocodePlace>;
}
export interface TransformationInput {
    context: Uint8Array;
    response: HttpRequestResult;
}
export interface HeatRiskArea {
    id: HeatRiskAreaId;
    communityDensityFactor: number;
    baseTemp: number;
    latitude: number;
    title: string;
    apparentTemp: number;
    createdAt: Time;
    recommendedGreenArea: number;
    vegetationFactor: number;
    recommendedShelters: bigint;
    longitude: number;
    buildingFactor: number;
    radiusMeters: number;
    riskLevel: string;
    riskScore: bigint;
}
export interface GeocodePlace {
    lat: number;
    lng: number;
    country: string;
    name: string;
}
export type HeatRiskAreaId = bigint;
export interface WildfirePoint {
    lat: number;
    lng: number;
    satellite: string;
    brightness: number;
    acqDate: string;
    confidence: bigint;
}
export type PinId = bigint;
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createHeatRiskArea(input: HeatRiskAreaInput, riskScore: bigint, apparentTemp: number, vegetationFactor: number, buildingFactor: number, baseTemp: number, riskLevel: string, recommendedShelters: bigint, recommendedGreenArea: number, communityDensityFactor: number | null): Promise<HeatRiskAreaId>;
    createPin(input: PinInput): Promise<PinId>;
    deleteHeatRiskArea(id: HeatRiskAreaId): Promise<void>;
    deletePin(id: PinId): Promise<void>;
    fetchGovData(q: string): Promise<GovDataResponse>;
    fetchWildfireData(bbox: BBox): Promise<WildfireResponse>;
    geocodeSearch(q: string): Promise<GeocodeResult>;
    getCallerUserRole(): Promise<UserRole>;
    isCallerAdmin(): Promise<boolean>;
    listHeatRiskAreas(): Promise<Array<HeatRiskArea>>;
    listPins(): Promise<Array<Pin>>;
    readHeatRiskArea(id: HeatRiskAreaId): Promise<HeatRiskArea | null>;
    readPin(id: PinId): Promise<Pin>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateHeatRiskArea(id: HeatRiskAreaId, input: HeatRiskAreaInput, riskScore: bigint, apparentTemp: number, vegetationFactor: number, buildingFactor: number, baseTemp: number, riskLevel: string, recommendedShelters: bigint, recommendedGreenArea: number, communityDensityFactor: number | null): Promise<void>;
    updatePin(id: PinId, input: PinInput): Promise<void>;
}
