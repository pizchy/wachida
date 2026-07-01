import { Eye, EyeOff, Flame, RefreshCw, Satellite } from "lucide-react";
import { useMemo } from "react";
import type { WildfirePoint } from "../backend.d";
import { useFetchWildfireData } from "../hooks/useQueries";

export interface WildfirePanelProps {
  /** Whether the wildfire layer is shown on the globe. */
  layerVisible: boolean;
  /** Toggle the wildfire layer on the globe. */
  onToggleLayer: (visible: boolean) => void;
  /** Fly the globe to a fire point. */
  onFlyTo: (lat: number, lng: number) => void;
  /** Manually trigger a refetch (passed from parent to control bbox). */
  bbox: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  } | null;
}

// Severity bucket from brightness (Kelvin) + confidence (0–100, bigint on wire).
// NASA FIRMS brightness: ~300K (low) → ~500K+ (extreme).
function severityOf(
  fire: WildfirePoint,
): "low" | "moderate" | "high" | "extreme" {
  const conf = Number(fire.confidence);
  // Combine brightness and confidence into a single severity signal.
  const score = fire.brightness * 0.6 + conf * 4;
  if (score >= 360) return "extreme";
  if (score >= 320) return "high";
  if (score >= 300) return "moderate";
  return "low";
}

const SEVERITY_STYLES: Record<
  "low" | "moderate" | "high" | "extreme",
  { color: string; bg: string; label: string }
> = {
  low: { color: "#FACC15", bg: "rgba(250, 204, 21, 0.15)", label: "ต่ำ" },
  moderate: {
    color: "#FB923C",
    bg: "rgba(251, 146, 60, 0.15)",
    label: "ปานกลาง",
  },
  high: { color: "#EF4444", bg: "rgba(239, 68, 68, 0.15)", label: "สูง" },
  extreme: { color: "#DC2626", bg: "rgba(220, 38, 38, 0.2)", label: "วิกฤต" },
};

function confidenceLabel(conf: bigint): string {
  const n = Number(conf);
  if (n >= 90) return "สูง";
  if (n >= 60) return "ปานกลาง";
  return "ต่ำ";
}

export function WildfirePanel({
  layerVisible,
  onToggleLayer,
  onFlyTo,
  bbox,
}: WildfirePanelProps) {
  const { data, isLoading, isFetching, refetch } = useFetchWildfireData(bbox);
  const fires = data?.fires ?? [];

  // Sort by severity (extreme first) then brightness descending.
  const sortedFires = useMemo(() => {
    return [...fires].sort((a, b) => {
      const sa = severityOf(a);
      const sb = severityOf(b);
      const order = { extreme: 0, high: 1, moderate: 2, low: 3 } as const;
      if (order[sa] !== order[sb]) return order[sa] - order[sb];
      return b.brightness - a.brightness;
    });
  }, [fires]);

  return (
    <div className="glass-panel flex-shrink-0" style={{ width: 268 }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(43, 52, 67, 0.6)" }}
      >
        <div className="flex items-center gap-2">
          <Flame size={14} style={{ color: "#E25A5A" }} />
          <span
            className="text-[11px] font-semibold tracking-widest"
            style={{ color: "#AAB4C3" }}
          >
            ไฟป่า
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onToggleLayer(!layerVisible)}
            className="w-7 h-7 rounded flex items-center justify-center transition-colors"
            style={{
              background: layerVisible
                ? "rgba(226, 90, 90, 0.15)"
                : "transparent",
              border: "1px solid rgba(43, 52, 67, 0.6)",
              color: layerVisible ? "#E25A5A" : "#AAB4C3",
            }}
            aria-label={layerVisible ? "ซ่อนเลเยอร์ไฟป่า" : "แสดงเลเยอร์ไฟป่า"}
            title={layerVisible ? "ซ่อนเลเยอร์" : "แสดงเลเยอร์"}
            data-ocid="wildfire.layer.toggle"
          >
            {layerVisible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="w-7 h-7 rounded flex items-center justify-center transition-colors disabled:opacity-40"
            style={{
              background: "transparent",
              border: "1px solid rgba(43, 52, 67, 0.6)",
              color: "#AAB4C3",
            }}
            aria-label="รีเฟรชข้อมูลไฟป่า"
            title="รีเฟรช"
            data-ocid="wildfire.refresh.button"
          >
            <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Status row */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: "1px solid rgba(43, 52, 67, 0.3)" }}
      >
        <span className="text-[10px] font-mono" style={{ color: "#AAB4C3" }}>
          {isFetching ? "กำลังอัปเดต..." : `${fires.length} จุดไฟ`}
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full"
          style={{
            background: layerVisible
              ? "rgba(226, 90, 90, 0.15)"
              : "rgba(43, 52, 67, 0.5)",
            color: layerVisible ? "#E25A5A" : "#AAB4C3",
            border: `1px solid ${
              layerVisible ? "rgba(226, 90, 90, 0.35)" : "rgba(43, 52, 67, 0.6)"
            }`,
          }}
          data-ocid="wildfire.layer.badge"
        >
          {layerVisible ? "แสดงเลเยอร์" : "ซ่อนเลเยอร์"}
        </span>
      </div>

      {/* List */}
      <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
        {isLoading ? (
          <div
            className="px-3 py-4 text-center"
            data-ocid="wildfire.loading_state"
          >
            <p className="text-[11px]" style={{ color: "#AAB4C3" }}>
              กำลังโหลดข้อมูลไฟป่า...
            </p>
          </div>
        ) : sortedFires.length === 0 ? (
          <div
            className="px-3 py-6 text-center"
            data-ocid="wildfire.empty_state"
          >
            <Flame
              size={20}
              className="mx-auto mb-2 opacity-30"
              style={{ color: "#AAB4C3" }}
            />
            <p className="text-[11px]" style={{ color: "#AAB4C3" }}>
              ไม่พบจุดไฟในพื้นที่
            </p>
          </div>
        ) : (
          <div className="py-1">
            {sortedFires.map((fire, i) => {
              const sev = severityOf(fire);
              const style = SEVERITY_STYLES[sev];
              return (
                <button
                  type="button"
                  key={`${fire.lat},${fire.lng},${fire.acqDate},${i}`}
                  onClick={() => onFlyTo(fire.lat, fire.lng)}
                  className="w-full px-3 py-2.5 text-left transition-colors"
                  style={{ borderBottom: "1px solid rgba(43, 52, 67, 0.3)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "rgba(226, 90, 90, 0.08)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                  data-ocid={`wildfire.item.${i + 1}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ background: style.bg, color: style.color }}
                    >
                      {style.label}
                    </span>
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: "#AAB4C3" }}
                    >
                      {fire.brightness.toFixed(0)}K
                    </span>
                  </div>
                  <p
                    className="text-[11px] font-mono"
                    style={{ color: "#E8EDF6" }}
                  >
                    {fire.lat.toFixed(3)}°, {fire.lng.toFixed(3)}°
                  </p>
                  <div
                    className="flex items-center gap-2 mt-1 text-[10px]"
                    style={{ color: "#AAB4C3" }}
                  >
                    <span>
                      ระดับความเชื่อมั่น: {confidenceLabel(fire.confidence)}
                    </span>
                  </div>
                  <div
                    className="flex items-center gap-2 mt-0.5 text-[10px]"
                    style={{ color: "#AAB4C3" }}
                  >
                    <Satellite size={10} />
                    <span>{fire.satellite}</span>
                    <span style={{ color: "rgba(170,180,195,0.5)" }}>·</span>
                    <span>{fire.acqDate}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
