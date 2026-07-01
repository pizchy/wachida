import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ColorLegend } from "./components/ColorLegend";
import { FeatureDetailsPanel } from "./components/FeatureDetailsPanel";
import { GovDataStatus } from "./components/GovDataStatus";
import { HeatRiskAreasPanel } from "./components/HeatRiskAreasPanel";
import { HeatRiskControlPanel } from "./components/HeatRiskControlPanel";
import { HeatRiskReportPanel } from "./components/HeatRiskReportPanel";
import { LayerToolbar } from "./components/LayerToolbar";
import { NewPinDialog } from "./components/NewPinDialog";
import { OverlaysPanel } from "./components/OverlaysPanel";
import { PinManagerPanel } from "./components/PinManagerPanel";
import { SearchBox } from "./components/SearchBox";
import { TemperaturePanel } from "./components/TemperaturePanel";
import { TopBar } from "./components/TopBar";
import { WildfirePanel } from "./components/WildfirePanel";
import { GlobeScene } from "./components/globe/GlobeScene";
import { computeRiskScore } from "./lib/heatRiskEngine";
import {
  BANGKOK_DENSITY_LABELS,
  type BangkokCommunity,
} from "./lib/textureGenerator";

import type { BBox, GeocodePlace, Pin, WildfirePoint } from "./backend.d";
import {
  useCreatePin,
  useDeletePin,
  useFetchWildfireData,
  useListPins,
  useUpdatePin,
} from "./hooks/useQueries";
import type { ActiveLayer, ToolMode } from "./types/globe";
import type { HeatRiskArea, HeatRiskResult } from "./types/heatRisk";

const queryClient = new QueryClient();

// Default global bounding box for wildfire fetches.
const GLOBAL_BBOX: BBox = {
  minLat: -90,
  minLng: -180,
  maxLat: 90,
  maxLng: 180,
};

// Estimate a base temperature (°C) from latitude. Equator (~0°) is hottest;
// poles (~±90°) are coldest. Adds a small deterministic jitter from longitude
// so consecutive clicks at the same latitude don't all read identically.
function estimateTemperature(lat: number, lng: number): number {
  const base = 30 - Math.abs(lat) * 0.5;
  const jitter = 2 * Math.sin((lng * Math.PI) / 30);
  return Math.round((base + jitter) * 10) / 10;
}

// Approximate Bangkok metropolitan bounding box. Used to auto-fill the
// communityDensityFactor when the user picks a heat-risk point inside the
// Bangkok area — dense urban communities there warrant a higher default.
// Bounds are loose (greater Bangkok region) so nearby peri-urban points
// also benefit from the auto-estimate.
const BANGKOK_BBOX = {
  minLat: 13.4,
  maxLat: 13.95,
  minLng: 100.32,
  maxLng: 100.92,
};

// Estimate a 0–1 communityDensityFactor from a coordinate. Points inside the
// Bangkok metropolitan bbox get a higher default (dense urban communities);
// points outside keep the standard default. The estimate uses a smooth radial
// falloff from the Bangkok center so the value tapers rather than snapping
// at the bbox edge.
function estimateCommunityDensity(lat: number, lng: number): number {
  const insideBbox =
    lat >= BANGKOK_BBOX.minLat &&
    lat <= BANGKOK_BBOX.maxLat &&
    lng >= BANGKOK_BBOX.minLng &&
    lng <= BANGKOK_BBOX.maxLng;
  if (!insideBbox) return 0.6;

  // Bangkok city center ~13.7563, 100.5018. Closer to the core → denser.
  const centerLat = 13.7563;
  const centerLng = 100.5018;
  const dLat = lat - centerLat;
  const dLng = lng - centerLng;
  // Rough distance in degrees (good enough for a 0–1 estimate).
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);
  // 0 at center → 0.85; ~0.4° out → 0.6. Clamp to [0.6, 0.9].
  const estimate = 0.85 - dist * 0.625;
  return Math.min(0.9, Math.max(0.6, Math.round(estimate * 20) / 20));
}

function GlobeApp() {
  const [activeLayers, setActiveLayers] = useState<ActiveLayer[]>([]);
  const [mode, setMode] = useState<ToolMode>("globe");
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pendingPin, setPendingPin] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Heat-risk forecasting tool state.
  const [heatRiskCenter, setHeatRiskCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [heatRiskRadius, setHeatRiskRadius] = useState<number>(500);
  const [heatRiskResult, setHeatRiskResult] = useState<HeatRiskResult | null>(
    null,
  );

  // Heat-risk factor inputs. vegetationFactor and buildingFactor use sensible
  // defaults so agencies get an immediate read on any clicked location;
  // communityDensityFactor is auto-estimated when the user picks a point
  // inside the Bangkok metropolitan area, otherwise it stays at its default
  // and the user can adjust it via the control panel slider.
  const [vegetationFactor] = useState<number>(0.4);
  const [buildingFactor] = useState<number>(0.6);
  const [communityDensityFactor, setCommunityDensityFactor] =
    useState<number>(0.6);

  // Currently selected Bangkok dense-community marker. Set when the user
  // clicks a BangkokCommunityMarker on the globe; cleared via the popup close
  // button. Drives the HTML popup that shows the community name + density.
  const [selectedCommunity, setSelectedCommunity] =
    useState<BangkokCommunity | null>(null);

  // Camera fly-to target. `nonce` changes per request so the controller
  // re-triggers even when flying to the same coordinates twice in a row.
  const [flyTarget, setFlyTarget] = useState<{
    lat: number;
    lng: number;
    nonce: number;
  } | null>(null);

  // Wildfire layer visibility + bounding box for the data fetch.
  const [wildfireLayerVisible, setWildfireLayerVisible] =
    useState<boolean>(false);
  const [wildfireBbox] = useState<BBox>(GLOBAL_BBOX);

  // Temperature tool reading (lat/lng + computed °C). Null until the user
  // clicks the globe in temperature mode.
  const [temperatureReading, setTemperatureReading] = useState<{
    lat: number;
    lng: number;
    temp: number;
  } | null>(null);

  const { data: pins = [] } = useListPins();
  const createPin = useCreatePin();
  const updatePin = useUpdatePin();
  const deletePin = useDeletePin();
  const wildfireQuery = useFetchWildfireData(wildfireBbox);
  const wildfirePoints: WildfirePoint[] = wildfireQuery.data?.fires ?? [];

  const handlePinClick = useCallback((pin: Pin) => {
    setSelectedPin(pin);
    setDetailsOpen(true);
  }, []);

  const handleGlobeClick = useCallback(
    (lat: number, lng: number) => {
      if (mode === "heat-risk") {
        setHeatRiskCenter({ lat, lng });
        // Auto-estimate the community density factor from the picked
        // coordinate. Points inside the Bangkok metropolitan area get a
        // higher default; elsewhere stays at the standard default. The
        // user can still fine-tune via the control panel slider.
        setCommunityDensityFactor(estimateCommunityDensity(lat, lng));
        return;
      }
      if (mode === "temperature") {
        setTemperatureReading({
          lat,
          lng,
          temp: estimateTemperature(lat, lng),
        });
        return;
      }
      if (mode === "pin") {
        setPendingPin({ lat, lng });
      }
    },
    [mode],
  );

  // Fly the globe camera to a lat/lng. Bumping `nonce` ensures the
  // FlyToController re-triggers even for repeated identical coordinates.
  const handleFlyTo = useCallback((lat: number, lng: number) => {
    setFlyTarget({ lat, lng, nonce: Date.now() });
  }, []);

  // Search result selection: fly to the place and open the pin dialog
  // pre-filled with its coordinates.
  const handleSearchSelect = useCallback(
    (place: GeocodePlace) => {
      handleFlyTo(place.lat, place.lng);
      setPendingPin({ lat: place.lat, lng: place.lng });
    },
    [handleFlyTo],
  );

  // Clicking a wildfire marker on the globe flies to it.
  const handleWildfireClick = useCallback(
    (fire: WildfirePoint) => {
      handleFlyTo(fire.lat, fire.lng);
    },
    [handleFlyTo],
  );

  // Save the current temperature reading as a pin: open the pin dialog with
  // the measured coordinates pre-filled.
  const handleSaveTemperaturePin = useCallback(() => {
    if (!temperatureReading) return;
    setPendingPin({ lat: temperatureReading.lat, lng: temperatureReading.lng });
  }, [temperatureReading]);

  // Recompute the heat-risk preview whenever the analysis center, radius, or
  // community density factor changes. vegetationFactor and buildingFactor are
  // stable defaults; communityDensityFactor is user-adjustable via the
  // control panel slider (and auto-estimated when a Bangkok point is picked).
  useEffect(() => {
    if (!heatRiskCenter) {
      setHeatRiskResult(null);
      return;
    }
    const result = computeRiskScore(
      heatRiskCenter.lat,
      heatRiskRadius,
      vegetationFactor,
      buildingFactor,
      communityDensityFactor,
      35, // baseTemp (°C)
    );
    setHeatRiskResult(result);
  }, [
    heatRiskCenter,
    heatRiskRadius,
    vegetationFactor,
    buildingFactor,
    communityDensityFactor,
  ]);

  const handleDropPin = useCallback(
    (title: string, description: string) => {
      if (!pendingPin) return;
      createPin.mutate(
        {
          latitude: pendingPin.lat,
          longitude: pendingPin.lng,
          title,
          description,
        },
        {
          onSuccess: () => toast.success("ปักหมุดแล้ว!"),
          onError: () => toast.error("ไม่สามารถสร้างหมุดได้"),
        },
      );
      setPendingPin(null);
      setMode("globe");
    },
    [pendingPin, createPin],
  );

  const handleUpdatePin = useCallback(
    (id: bigint, title: string, description: string) => {
      if (!selectedPin) return;
      updatePin.mutate(
        {
          id,
          input: {
            latitude: selectedPin.latitude,
            longitude: selectedPin.longitude,
            title,
            description,
          },
        },
        {
          onSuccess: () => toast.success("อัปเดตหมุดแล้ว!"),
          onError: () => toast.error("ไม่สามารถอัปเดตหมุดได้"),
        },
      );
    },
    [selectedPin, updatePin],
  );

  const handleDeletePin = useCallback(
    (id: bigint) => {
      deletePin.mutate(id, {
        onSuccess: () => {
          toast.success("ลบหมุดแล้ว");
          if (selectedPin?.id === id) {
            setSelectedPin(null);
            setDetailsOpen(false);
          }
        },
        onError: () => toast.error("ไม่สามารถลบหมุดได้"),
      });
    },
    [selectedPin, deletePin],
  );

  const handleModeChange = useCallback((newMode: ToolMode) => {
    setMode(newMode);
  }, []);

  // Fly the globe to a saved heat-risk area: set the analysis center to the
  // area's coordinates and the radius to the area's saved radius.
  const handleSelectHeatRiskArea = useCallback((area: HeatRiskArea) => {
    setHeatRiskCenter({ lat: area.latitude, lng: area.longitude });
    setHeatRiskRadius(area.radiusMeters);
  }, []);

  // Bangkok dense-community overlay is visible when the bangkok_density layer
  // is active in the overlays panel. Derived from activeLayers so the markers
  // appear/disappear in lockstep with the texture overlay.
  const showBangkokDensity = activeLayers.some(
    (layer) => layer.id === "bangkok_density",
  );

  // Selecting a Bangkok community marker on the globe surfaces its name +
  // density level through the HTML popup. Also fly the camera to it so the
  // user keeps context.
  const handleCommunitySelect = useCallback(
    (community: BangkokCommunity) => {
      setSelectedCommunity(community);
      handleFlyTo(community.lat, community.lng);
    },
    [handleFlyTo],
  );

  return (
    <div className="fixed inset-0 overflow-hidden star-bg">
      {/* Globe canvas fills everything */}
      <div
        className="absolute inset-0"
        style={{
          cursor:
            mode === "pin" || mode === "heat-risk" ? "crosshair" : "default",
        }}
      >
        <GlobeScene
          activeLayers={activeLayers}
          pins={pins}
          selectedPin={selectedPin}
          mode={mode}
          onPinClick={handlePinClick}
          onDropPin={handleGlobeClick}
          heatRiskCenter={heatRiskCenter}
          heatRiskRadius={heatRiskRadius}
          heatRiskResult={heatRiskResult}
          flyTarget={flyTarget}
          wildfirePoints={wildfirePoints}
          showWildfireLayer={wildfireLayerVisible}
          onWildfireClick={handleWildfireClick}
          showBangkokDensity={showBangkokDensity}
          selectedCommunity={selectedCommunity}
          onCommunitySelect={handleCommunitySelect}
        />
      </div>

      {/* Top bar */}
      <TopBar />

      {/* Government data status — floating overlay top-right, below the top
           bar. Shows the data source (mock vs live), last fetched time, and
           a refresh button that invalidates the govData query. Sits above the
           heat-risk control panel (which only renders in heat-risk mode) so
           there is no visual collision. */}
      <div
        className="fixed right-4 top-[72px] z-40"
        style={{ pointerEvents: "auto" }}
      >
        <GovDataStatus />
      </div>

      {/* Search box — floating overlay below the top bar */}
      <div
        className="fixed left-1/2 top-[80px] z-40 w-[320px]"
        style={{ transform: "translateX(-50%)", pointerEvents: "auto" }}
      >
        <SearchBox onSelect={handleSearchSelect} />
      </div>

      {/* Left sidepanels — scrollable column so both panels are always visible */}
      <div
        className="fixed left-4 top-[140px] z-40 flex flex-col gap-3 overflow-y-auto"
        style={{ maxHeight: "calc(100vh - 148px)", paddingBottom: 16 }}
      >
        <OverlaysPanel activeLayers={activeLayers} onChange={setActiveLayers} />
        <PinManagerPanel
          pins={pins}
          selectedPin={selectedPin}
          mode={mode}
          onDropPin={() => setMode("pin")}
          onEditPin={() => selectedPin && setDetailsOpen(true)}
          onDeletePin={handleDeletePin}
          onSelectPin={(pin) => {
            setSelectedPin(pin);
            setDetailsOpen(true);
          }}
        />
        <WildfirePanel
          layerVisible={wildfireLayerVisible}
          onToggleLayer={setWildfireLayerVisible}
          onFlyTo={handleFlyTo}
          bbox={wildfireBbox}
        />
        {mode === "heat-risk" && (
          <HeatRiskAreasPanel
            visible={true}
            onSelectArea={handleSelectHeatRiskArea}
          />
        )}
      </div>

      {/* Right details panel */}
      <FeatureDetailsPanel
        pin={selectedPin}
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onUpdate={handleUpdatePin}
        onDelete={handleDeletePin}
      />

      {/* Heat-risk control panel — right side, only in heat-risk mode.
          Positioned below the GovDataStatus indicator to avoid overlap. */}
      {mode === "heat-risk" && (
        <div
          className="fixed right-4 top-[124px] z-40"
          style={{ pointerEvents: "auto" }}
        >
          <HeatRiskControlPanel
            heatRiskCenter={heatRiskCenter}
            heatRiskRadius={heatRiskRadius}
            heatRiskResult={heatRiskResult}
            onRadiusChange={setHeatRiskRadius}
            communityDensityFactor={communityDensityFactor}
            onCommunityDensityChange={setCommunityDensityFactor}
          />
        </div>
      )}

      {/* Temperature reading panel — right side, only in temperature mode.
          Renders near the HeatRiskControlPanel block, which is gated to
          heat-risk mode, so there is no visual collision. */}
      <div
        className="fixed right-4 top-[140px] z-40"
        style={{ pointerEvents: "auto" }}
      >
        <TemperaturePanel
          visible={mode === "temperature"}
          temperature={temperatureReading?.temp ?? null}
          coords={
            temperatureReading
              ? { lat: temperatureReading.lat, lng: temperatureReading.lng }
              : null
          }
          onSavePin={handleSaveTemperaturePin}
          onClose={() => setTemperatureReading(null)}
        />
      </div>

      {/* Heat-risk report panel — slides in from the right when a result is
           available. onClose clears the result so the user can pick a new spot. */}
      <HeatRiskReportPanel
        visible={!!heatRiskResult}
        heatRiskCenter={heatRiskCenter}
        heatRiskRadius={heatRiskRadius}
        heatRiskResult={heatRiskResult}
        vegetationFactor={vegetationFactor}
        buildingFactor={buildingFactor}
        communityDensityFactor={communityDensityFactor}
        baseTemp={35}
        onClose={() => setHeatRiskResult(null)}
      />

      {/* Bangkok community popup — shows the selected community's name +
           density level (Thai label) with a close button. Uses glass-panel
           styling and the risk-* color class matching the density level so
           the popup visually echoes the marker color on the globe. */}
      {selectedCommunity && (
        <div
          className="glass-panel fixed left-1/2 top-[140px] z-40 w-[280px] p-4"
          style={{ transform: "translateX(-50%)", pointerEvents: "auto" }}
          data-ocid="community.popup"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                ชุมชนแออัด
              </p>
              <h3 className="mt-1 truncate font-display text-base font-semibold text-foreground">
                {selectedCommunity.name}
              </h3>
            </div>
            <button
              type="button"
              aria-label="ปิด"
              onClick={() => setSelectedCommunity(null)}
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-ocid="community.close_button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              ระดับความหนาแน่น:
            </span>
            <span
              className={`risk-${selectedCommunity.density} inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium`}
            >
              {BANGKOK_DENSITY_LABELS[selectedCommunity.density]}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            ละติจูด {selectedCommunity.lat.toFixed(4)}° · ลองจิจูด{" "}
            {selectedCommunity.lng.toFixed(4)}°
          </p>
        </div>
      )}

      {/* Bottom toolbar */}
      <LayerToolbar mode={mode} onChange={handleModeChange} />

      {/* Color legend */}
      <ColorLegend activeLayers={activeLayers} />

      {/* New pin dialog */}
      <NewPinDialog
        open={!!pendingPin}
        lat={pendingPin?.lat ?? 0}
        lng={pendingPin?.lng ?? 0}
        onConfirm={handleDropPin}
        onCancel={() => {
          setPendingPin(null);
          setMode("globe");
        }}
      />

      {/* Footer */}
      <div
        className="fixed bottom-2 left-1/2 z-30"
        style={{ transform: "translateX(-50%)", pointerEvents: "none" }}
      >
        <p className="text-[9px]" style={{ color: "rgba(170,180,195,0.4)" }}>
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            style={{ color: "rgba(58,135,255,0.6)", pointerEvents: "auto" }}
          >
            caffeine.ai
          </a>
        </p>
      </div>

      <Toaster />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <GlobeApp />
    </QueryClientProvider>
  );
}
