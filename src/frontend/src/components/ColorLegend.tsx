import { LAYERS } from "../lib/layerConfig";
import type { ActiveLayer } from "../types/globe";

interface ColorLegendProps {
  activeLayers: ActiveLayer[];
}

// Four-level markers along the heat-risk gradient bar (low → critical).
const HEAT_RISK_MARKERS = ["ต่ำ", "ปานกลาง", "สูง", "วิกฤต"] as const;

export function ColorLegend({ activeLayers }: ColorLegendProps) {
  const primaryLayerId = activeLayers[0]?.id;
  if (!primaryLayerId) return null;

  const layer = LAYERS.find((l) => l.id === primaryLayerId);
  if (!layer) return null;

  const isHeatRisk = primaryLayerId === "heat-risk";
  const gradientStyle = `linear-gradient(to right, ${layer.gradientColors.join(", ")})`;

  return (
    <div
      className="fixed bottom-28 right-4 z-40 glass-panel px-4 py-3"
      style={{ minWidth: 200 }}
      data-ocid="legend.panel"
    >
      <p
        className="text-[11px] font-semibold tracking-widest mb-1.5"
        style={{ color: "#AAB4C3" }}
      >
        {layer.label.toUpperCase()}
      </p>

      {isHeatRisk ? (
        // Heat-risk legend: token-driven .heat-gradient bar with 4 level markers.
        <div data-ocid="legend.heat_risk">
          <div className="h-2.5 rounded-full mb-1 heat-gradient" />
          <div className="flex justify-between px-0.5">
            {HEAT_RISK_MARKERS.map((marker) => (
              <span
                key={marker}
                className="text-[9px] font-medium"
                style={{ color: "#AAB4C3" }}
              >
                {marker}
              </span>
            ))}
          </div>
          <div className="flex justify-between mt-1">
            <span
              className="text-[11px] font-mono"
              style={{ color: "#AAB4C3" }}
            >
              ต่ำ (0)
            </span>
            <span
              className="text-[11px] font-mono"
              style={{ color: "#AAB4C3" }}
            >
              วิกฤต (100)
            </span>
          </div>
        </div>
      ) : (
        // Default legend for all other layers.
        <div>
          <div
            className="h-2.5 rounded-full mb-1"
            style={{ background: gradientStyle }}
          />
          <div className="flex justify-between">
            <span
              className="text-[11px] font-mono"
              style={{ color: "#AAB4C3" }}
            >
              {layer.minLabel}
            </span>
            <span
              className="text-[11px] font-mono"
              style={{ color: "#AAB4C3" }}
            >
              {layer.maxLabel}
            </span>
          </div>
        </div>
      )}

      {activeLayers.length > 1 && (
        <p className="text-[10px] mt-1.5" style={{ color: "#4A5568" }}>
          +{activeLayers.length - 1} เลเยอร์เพิ่มเติม
        </p>
      )}
    </div>
  );
}
