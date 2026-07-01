import { Flame, MapPin, Thermometer, Users } from "lucide-react";
import type { HeatRiskResult } from "../types/heatRisk";

interface HeatRiskCenter {
  lat: number;
  lng: number;
}

interface HeatRiskControlPanelProps {
  heatRiskCenter: HeatRiskCenter | null;
  heatRiskRadius: number;
  heatRiskResult: HeatRiskResult | null;
  onRadiusChange: (radius: number) => void;
  communityDensityFactor: number;
  onCommunityDensityChange: (value: number) => void;
}

const RADIUS_MIN = 50;
const RADIUS_MAX = 2000;
const RADIUS_STEP = 50;

const DENSITY_MIN = 0;
const DENSITY_MAX = 1;
const DENSITY_STEP = 0.05;

/** Format a meter value as a compact Thai-friendly string (m or km). */
function formatRadius(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${km % 1 === 0 ? km : km.toFixed(1)} กม.`;
  }
  return `${meters} ม.`;
}

/** Map a Thai risk level to its CSS surface class. */
function riskClass(level: string): string {
  switch (level) {
    case "ต่ำ":
      return "risk-low";
    case "ปานกลาง":
      return "risk-medium";
    case "สูง":
      return "risk-high";
    case "วิกฤต":
      return "risk-critical";
    default:
      return "risk-low";
  }
}

export function HeatRiskControlPanel({
  heatRiskCenter,
  heatRiskRadius,
  heatRiskResult,
  onRadiusChange,
  communityDensityFactor,
  onCommunityDensityChange,
}: HeatRiskControlPanelProps) {
  const sliderPercent =
    ((heatRiskRadius - RADIUS_MIN) / (RADIUS_MAX - RADIUS_MIN)) * 100;
  const densityPercent = communityDensityFactor * 100;

  return (
    <div
      className="glass-panel shadow-panel slide-in-right"
      style={{ width: 268 }}
      data-ocid="heatrisk.panel"
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid rgba(43, 52, 67, 0.6)" }}
      >
        <Flame size={14} style={{ color: "#FF8A3D" }} />
        <span
          className="text-[12px] font-semibold tracking-wide"
          style={{ color: "#E8EDF6" }}
        >
          พยากรณ์ความเสี่ยงความร้อน
        </span>
      </div>

      {/* Radius slider */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: "1px solid rgba(43, 52, 67, 0.4)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="heat-risk-radius"
            className="text-[11px] font-medium tracking-wider"
            style={{ color: "#AAB4C3" }}
          >
            รัศมีวิเคราะห์
          </label>
          <span
            className="text-[11px] font-mono px-2 py-0.5 rounded"
            style={{
              background: "rgba(58, 135, 255, 0.15)",
              color: "#3A87FF",
            }}
          >
            {formatRadius(heatRiskRadius)}
          </span>
        </div>
        <input
          id="heat-risk-radius"
          type="range"
          min={RADIUS_MIN}
          max={RADIUS_MAX}
          step={RADIUS_STEP}
          value={heatRiskRadius}
          onChange={(e) => onRadiusChange(Number.parseInt(e.target.value, 10))}
          className="w-full h-1.5 cursor-pointer"
          style={{
            accentColor: "#FF8A3D",
            background: `linear-gradient(90deg, #FF8A3D ${sliderPercent}%, rgba(43,52,67,0.6) ${sliderPercent}%)`,
            borderRadius: 999,
          }}
          data-ocid="heatrisk.radius.input"
        />
        <div
          className="flex justify-between mt-1.5 text-[9px] font-mono"
          style={{ color: "#6B7A8F" }}
        >
          <span>50 ม.</span>
          <span>2000 ม.</span>
        </div>
      </div>

      {/* Community density slider — 4th heat-risk factor (0–1, shown as %) */}
      <div
        className="px-4 py-3"
        style={{ borderBottom: "1px solid rgba(43, 52, 67, 0.4)" }}
      >
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="heat-risk-density"
            className="text-[11px] font-medium tracking-wider flex items-center gap-1.5"
            style={{ color: "#AAB4C3" }}
          >
            <Users size={11} style={{ color: "#AAB4C3" }} />
            ความหนาแน่นชุมชน
          </label>
          <span
            className="text-[11px] font-mono px-2 py-0.5 rounded"
            style={{
              background: "rgba(255, 138, 61, 0.15)",
              color: "#FF8A3D",
            }}
          >
            {Math.round(densityPercent)}%
          </span>
        </div>
        <input
          id="heat-risk-density"
          type="range"
          min={DENSITY_MIN}
          max={DENSITY_MAX}
          step={DENSITY_STEP}
          value={communityDensityFactor}
          onChange={(e) =>
            onCommunityDensityChange(Number.parseFloat(e.target.value))
          }
          className="w-full h-1.5 cursor-pointer"
          style={{
            accentColor: "#FF8A3D",
            background: `linear-gradient(90deg, #FF8A3D ${densityPercent}%, rgba(43,52,67,0.6) ${densityPercent}%)`,
            borderRadius: 999,
          }}
          data-ocid="heatrisk.density.input"
        />
        <div
          className="flex justify-between mt-1.5 text-[9px] font-mono"
          style={{ color: "#6B7A8F" }}
        >
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Body — instructions or summary */}
      {!heatRiskCenter || !heatRiskResult ? (
        <div className="px-4 py-6 text-center" data-ocid="heatrisk.empty_state">
          <MapPin
            size={20}
            className="mx-auto mb-2 opacity-40"
            style={{ color: "#AAB4C3" }}
          />
          <p
            className="text-[12px] leading-relaxed"
            style={{ color: "#AAB4C3" }}
          >
            คลิกบนโลกเพื่อเลือกพื้นที่วิเคราะห์
          </p>
        </div>
      ) : (
        <div className="px-4 py-3 space-y-3">
          {/* Selected center */}
          <div
            className="flex items-center gap-1.5 text-[10px] font-mono"
            style={{ color: "#6B7A8F" }}
          >
            <MapPin size={10} style={{ color: "#FF5C7A" }} />
            <span className="truncate">
              {heatRiskCenter.lat.toFixed(3)}°, {heatRiskCenter.lng.toFixed(3)}°
            </span>
          </div>

          {/* Risk score + level badge */}
          <div
            className="flex items-center justify-between p-3 rounded"
            style={{ background: "rgba(12, 16, 24, 0.6)" }}
          >
            <div>
              <div
                className="text-[10px] tracking-wider mb-0.5"
                style={{ color: "#6B7A8F" }}
              >
                คะแนนความเสี่ยง
              </div>
              <div
                className="text-2xl font-bold font-mono leading-none"
                style={{ color: "#E8EDF6" }}
              >
                {heatRiskResult.riskScore}
                <span
                  className="text-[11px] font-normal ml-0.5"
                  style={{ color: "#6B7A8F" }}
                >
                  /100
                </span>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 rounded text-[11px] font-semibold ${riskClass(
                heatRiskResult.riskLevel,
              )}`}
              data-ocid="heatrisk.level.badge"
            >
              {heatRiskResult.riskLevel}
            </span>
          </div>

          {/* Apparent temperature */}
          <div
            className="flex items-center gap-2 p-2.5 rounded"
            style={{
              background: "rgba(12, 16, 24, 0.4)",
              border: "1px solid rgba(43, 52, 67, 0.4)",
            }}
          >
            <Thermometer size={14} style={{ color: "#FF8A3D" }} />
            <span className="text-[11px]" style={{ color: "#AAB4C3" }}>
              อุณหภูมิที่รู้สึก
            </span>
            <span
              className="ml-auto text-[13px] font-mono font-semibold"
              style={{ color: "#E8EDF6" }}
            >
              {heatRiskResult.apparentTemp}°C
            </span>
          </div>

          {/* Agency resource recommendations */}
          <div
            className="grid grid-cols-2 gap-2 pt-1"
            style={{ borderTop: "1px solid rgba(43, 52, 67, 0.4)" }}
          >
            <div className="pt-2">
              <div
                className="text-[9px] tracking-wider mb-0.5"
                style={{ color: "#6B7A8F" }}
              >
                ศูนย์หลบร้อน
              </div>
              <div
                className="text-[14px] font-mono font-semibold"
                style={{ color: "#3A87FF" }}
              >
                {heatRiskResult.recommendedShelters}
              </div>
            </div>
            <div className="pt-2">
              <div
                className="text-[9px] tracking-wider mb-0.5"
                style={{ color: "#6B7A8F" }}
              >
                พื้นที่สีเขียว
              </div>
              <div
                className="text-[14px] font-mono font-semibold"
                style={{ color: "#38B56A" }}
              >
                {heatRiskResult.recommendedGreenArea}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
