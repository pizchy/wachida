import { createActor } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BBox,
  GovDataResponse as BackendGovDataResponse,
  GeocodePlace,
  GeocodeResult,
  Pin,
  PinInput,
  WildfireResponse,
} from "../backend.d";
import type {
  GovDataActor,
  GovDataPoint,
  GovDataResponse,
} from "../types/govData";
import { GOV_DATA_FALLBACK_RESPONSE } from "../types/govData";
import type {
  HeatRiskActor,
  HeatRiskArea,
  HeatRiskAreaId,
  HeatRiskAreaInput,
} from "../types/heatRisk";

// The backend actor returned by useActor. backend.d.ts declares the
// geocode/wildfire/heat-risk/gov-data methods, but we still cast for the
// heat-risk and gov-data record shape parity with the local interfaces.
type BackendActor = ReturnType<typeof createActor> &
  HeatRiskActor &
  GovDataActor;

function useBackend() {
  return useActor(createActor) as {
    actor: BackendActor | null;
    isFetching: boolean;
  };
}

// ---------------------------------------------------------------------------
// Pin hooks
// ---------------------------------------------------------------------------

export function useListPins() {
  const { actor, isFetching } = useBackend();
  return useQuery<Pin[]>({
    queryKey: ["pins"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listPins();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreatePin() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PinInput) => {
      if (!actor) throw new Error("No actor");
      return actor.createPin(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pins"] });
    },
  });
}

export function useUpdatePin() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: bigint; input: PinInput }) => {
      if (!actor) throw new Error("No actor");
      return actor.updatePin(id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pins"] });
    },
  });
}

export function useDeletePin() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("No actor");
      return actor.deletePin(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pins"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Heat-risk area hooks
// ---------------------------------------------------------------------------

export function useListHeatRiskAreas() {
  const { actor, isFetching } = useBackend();
  return useQuery<HeatRiskArea[]>({
    queryKey: ["heatRiskAreas"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listHeatRiskAreas();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useReadHeatRiskArea(id: HeatRiskAreaId | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<HeatRiskArea | null>({
    queryKey: ["heatRiskArea", id?.toString() ?? "none"],
    queryFn: async () => {
      if (!actor || id === null) throw new Error("No actor or id");
      return actor.readHeatRiskArea(id);
    },
    enabled: !!actor && !isFetching && id !== null,
  });
}

export function useCreateHeatRiskArea() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      input,
      riskScore,
      apparentTemp,
      vegetationFactor,
      buildingFactor,
      baseTemp,
      riskLevel,
      recommendedShelters,
      recommendedGreenArea,
      communityDensityFactor,
    }: {
      input: HeatRiskAreaInput;
      riskScore: bigint;
      apparentTemp: number;
      vegetationFactor: number;
      buildingFactor: number;
      baseTemp: number;
      riskLevel: string;
      recommendedShelters: bigint;
      recommendedGreenArea: number;
      communityDensityFactor: number;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.createHeatRiskArea(
        input,
        riskScore,
        apparentTemp,
        vegetationFactor,
        buildingFactor,
        baseTemp,
        riskLevel,
        recommendedShelters,
        recommendedGreenArea,
        communityDensityFactor,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["heatRiskAreas"] });
    },
  });
}

export function useUpdateHeatRiskArea() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
      riskScore,
      apparentTemp,
      vegetationFactor,
      buildingFactor,
      baseTemp,
      riskLevel,
      recommendedShelters,
      recommendedGreenArea,
      communityDensityFactor,
    }: {
      id: HeatRiskAreaId;
      input: HeatRiskAreaInput;
      riskScore: bigint;
      apparentTemp: number;
      vegetationFactor: number;
      buildingFactor: number;
      baseTemp: number;
      riskLevel: string;
      recommendedShelters: bigint;
      recommendedGreenArea: number;
      communityDensityFactor: number;
    }) => {
      if (!actor) throw new Error("No actor");
      return actor.updateHeatRiskArea(
        id,
        input,
        riskScore,
        apparentTemp,
        vegetationFactor,
        buildingFactor,
        baseTemp,
        riskLevel,
        recommendedShelters,
        recommendedGreenArea,
        communityDensityFactor,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["heatRiskAreas"] });
    },
  });
}

export function useDeleteHeatRiskArea() {
  const { actor } = useBackend();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: HeatRiskAreaId) => {
      if (!actor) throw new Error("No actor");
      return actor.deleteHeatRiskArea(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["heatRiskAreas"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Geocode search hook
// ---------------------------------------------------------------------------

// The backend returns GeocodeResult with both a parsed `results` array and a
// `rawJson` string (the raw Nominatim response). We surface the parsed
// GeocodePlace[] directly; callers that need the raw payload can read it from
// the mutation's data.rawJson.
export function useGeocodeSearch() {
  const { actor } = useBackend();
  return useMutation({
    mutationFn: async (query: string): Promise<GeocodePlace[]> => {
      if (!actor) throw new Error("No actor");
      const result: GeocodeResult = await actor.geocodeSearch(query);
      // Prefer the backend-parsed results array. Fall back to parsing rawJson
      // client-side if the parsed array is empty but rawJson has data.
      if (result.results && result.results.length > 0) {
        return result.results;
      }
      if (result.rawJson) {
        try {
          const parsed = JSON.parse(result.rawJson) as Array<{
            display_name?: string;
            lat?: string | number;
            lon?: string | number;
            address?: { country?: string };
          }>;
          return parsed
            .map((p) => {
              const lat = Number(p.lat);
              const lng = Number(p.lon);
              if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
              const name = p.display_name ?? "ไม่ระบุชื่อ";
              const country = p.address?.country ?? "";
              return { name, lat, lng, country };
            })
            .filter((p): p is GeocodePlace => p !== null);
        } catch {
          return [];
        }
      }
      return [];
    },
  });
}

// ---------------------------------------------------------------------------
// Wildfire data hook
// ---------------------------------------------------------------------------

export function useFetchWildfireData(bbox: BBox | null) {
  const { actor, isFetching } = useBackend();
  return useQuery<WildfireResponse>({
    queryKey: [
      "wildfire",
      bbox
        ? `${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}`
        : "none",
    ],
    queryFn: async () => {
      if (!actor || !bbox) throw new Error("No actor or bbox");
      return actor.fetchWildfireData(bbox);
    },
    enabled: !!actor && !isFetching && bbox !== null,
    staleTime: 60_000, // 1 minute — fire data is near-real-time but not live-ticker
  });
}

// ---------------------------------------------------------------------------
// Government data hook
// ---------------------------------------------------------------------------

// Fetches government observation data from the backend. The backend
// `fetchGovData(q)` returns a GovDataResponse envelope: when the upstream
// government endpoint is unreachable or not yet wired, `success` is false and
// `points` is empty. In that case (and when points is empty for any reason) we
// surface GOV_DATA_FALLBACK_RESPONSE so the UI never breaks — same defensive
// pattern as BANGKOK_COMMUNITIES in lib/textureGenerator.ts.
//
// The backend `GovDataPoint` uses `name` for the human-readable label, while
// the frontend canonical type (types/govData.ts) uses `label`. We map the
// backend response into the frontend shape here so callers work with `label`.
//
// `query` is an optional filter string forwarded to the backend (e.g. a region
// or agency name). Callers that want the default Bangkok dataset can omit it.
export function useFetchGovData(query = "") {
  const { actor, isFetching } = useBackend();
  return useQuery<GovDataResponse>({
    queryKey: ["govData", query],
    queryFn: async () => {
      if (!actor) throw new Error("No actor");
      const backend: BackendGovDataResponse = await actor.fetchGovData(query);
      if (!backend.success || backend.points.length === 0) {
        return GOV_DATA_FALLBACK_RESPONSE;
      }
      const points: GovDataPoint[] = backend.points.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        value: p.value,
        label: p.name,
        source: p.source,
      }));
      return {
        success: backend.success,
        points,
        source: backend.source,
        fetchedAt: backend.fetchedAt,
        error: backend.error,
      };
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000, // 1 minute — gov data updates infrequently
  });
}
