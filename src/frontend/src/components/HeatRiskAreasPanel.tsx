import { Flame, MapPin, Trash2 } from "lucide-react";
import {
  useDeleteHeatRiskArea,
  useListHeatRiskAreas,
} from "../hooks/useQueries";
import type { HeatRiskLevel } from "../lib/heatRiskEngine";
import type { HeatRiskArea } from "../types/heatRisk";

interface HeatRiskAreasPanelProps {
  /** Called when the user clicks a saved area — parent flies the globe to it. */
  onSelectArea: (area: HeatRiskArea) => void;
  /** Toggle panel visibility (slide in/out from the left). */
  visible: boolean;
}

// Risk-level → CSS surface class + Thai label. Mirrors the four-level scale
// defined in index.css (.risk-low / .risk-medium / .risk-high / .risk-critical).
const RISK_LEVELS: Record<HeatRiskLevel, { className: string; label: string }> =
  {
    ต่ำ: { className: "risk-low", label: "ต่ำ" },
    ปานกลาง: { className: "risk-medium", label: "ปานกลาง" },
    สูง: { className: "risk-high", label: "สูง" },
    วิกฤต: { className: "risk-critical", label: "วิกฤต" },
  };

export function HeatRiskAreasPanel({
  onSelectArea,
  visible,
}: HeatRiskAreasPanelProps) {
  const { data: areas = [], isLoading } = useListHeatRiskAreas();
  const deleteMutation = useDeleteHeatRiskArea();

  return (
    <div
      className={`glass-panel shadow-panel flex-shrink-0 transition-all duration-300 ${
        visible ? "slide-in-right" : "slide-out-right"
      }`}
      style={{ width: 268 }}
      data-ocid="heatrisk.panel"
    >
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
            พื้นที่วิเคราะห์ที่บันทึกไว้
          </span>
        </div>
        <span
          className="text-[11px] font-mono px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(226, 90, 90, 0.15)",
            color: "#E25A5A",
            border: "1px solid rgba(226, 90, 90, 0.35)",
          }}
          data-ocid="heatrisk.count.badge"
        >
          {areas.length}
        </span>
      </div>

      {/* List */}
      <div className="overflow-y-auto" style={{ maxHeight: 320 }}>
        {isLoading ? (
          <div
            className="px-3 py-4 text-center"
            data-ocid="heatrisk.loading_state"
          >
            <p className="text-[11px]" style={{ color: "#AAB4C3" }}>
              กำลังโหลด...
            </p>
          </div>
        ) : areas.length === 0 ? (
          <div
            className="px-3 py-6 text-center"
            data-ocid="heatrisk.empty_state"
          >
            <Flame
              size={20}
              className="mx-auto mb-2 opacity-30"
              style={{ color: "#AAB4C3" }}
            />
            <p className="text-[11px]" style={{ color: "#AAB4C3" }}>
              ยังไม่มีพื้นที่วิเคราะห์ที่บันทึกไว้
            </p>
          </div>
        ) : (
          <div className="py-1">
            {areas.map((area, i) => {
              const level = RISK_LEVELS[area.riskLevel as HeatRiskLevel];
              return (
                <div
                  key={area.id.toString()}
                  className="px-3 py-2.5 transition-colors"
                  style={{ borderBottom: "1px solid rgba(43, 52, 67, 0.3)" }}
                  data-ocid={`heatrisk.item.${i + 1}`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectArea(area)}
                    className="w-full flex items-start gap-2 text-left"
                    data-ocid={`heatrisk.select_button.${i + 1}`}
                  >
                    <MapPin
                      size={13}
                      style={{ color: "#E25A5A", flexShrink: 0, marginTop: 2 }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[13px] truncate"
                        style={{ color: "#E8EDF6" }}
                      >
                        {area.title || "พื้นที่ไม่มีชื่อ"}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${level.className}`}
                        >
                          {level.label}
                        </span>
                        <span
                          className="text-[11px] font-mono"
                          style={{ color: "#AAB4C3" }}
                        >
                          คะแนน {Number(area.riskScore)}/100
                        </span>
                      </div>
                    </div>
                  </button>
                  <div className="flex justify-end mt-1.5">
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(area.id)}
                      disabled={deleteMutation.isPending}
                      className="w-6 h-6 rounded flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
                      style={{ color: "#E25A5A" }}
                      aria-label="ลบพื้นที่วิเคราะห์"
                      data-ocid={`heatrisk.delete_button.${i + 1}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
