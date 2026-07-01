import { MapPin, Thermometer, X } from "lucide-react";

export interface TemperaturePanelProps {
  visible: boolean;
  /** Measured temperature in °C, or null if no measurement yet. */
  temperature: number | null;
  /** Coordinates of the measurement point. */
  coords: { lat: number; lng: number } | null;
  /** Save the measurement as a pin. */
  onSavePin: () => void;
  /** Close / clear the panel. */
  onClose: () => void;
}

// Pick a qualitative descriptor for the temperature reading (Thai).
function tempLabel(t: number): { label: string; color: string } {
  if (t >= 40) return { label: "ร้อนจัด", color: "#EF4444" };
  if (t >= 32) return { label: "ร้อน", color: "#FB923C" };
  if (t >= 25) return { label: "อบอุ่น", color: "#FACC15" };
  if (t >= 15) return { label: "เย็น", color: "#67D5FF" };
  return { label: "หนาว", color: "#3A87FF" };
}

export function TemperaturePanel({
  visible,
  temperature,
  coords,
  onSavePin,
  onClose,
}: TemperaturePanelProps) {
  const hasReading = temperature !== null && coords !== null;
  const meta = temperature !== null ? tempLabel(temperature) : null;

  return (
    <div
      className={`glass-panel transition-all duration-300 ${
        visible ? "slide-in-right" : "slide-out-right"
      }`}
      style={{ width: 268, pointerEvents: "auto" }}
      data-ocid="temperature.panel"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(43, 52, 67, 0.6)" }}
      >
        <div className="flex items-center gap-2">
          <Thermometer size={14} style={{ color: "#FF8A3D" }} />
          <span
            className="text-[11px] font-semibold tracking-widest"
            style={{ color: "#AAB4C3" }}
          >
            อุณหภูมิ
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 rounded flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: "#AAB4C3" }}
          aria-label="ปิดแผงอุณหภูมิ"
          data-ocid="temperature.close_button"
        >
          <X size={13} />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-4">
        {!hasReading ? (
          <div className="text-center py-4" data-ocid="temperature.empty_state">
            <Thermometer
              size={24}
              className="mx-auto mb-2 opacity-30"
              style={{ color: "#AAB4C3" }}
            />
            <p className="text-[11px]" style={{ color: "#AAB4C3" }}>
              คลิกบนโลกเพื่อวัดอุณหภูมิ
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Big temperature readout */}
            <div className="text-center py-2">
              <div
                className="text-4xl font-bold font-mono"
                style={{ color: meta?.color ?? "#E8EDF6" }}
                data-ocid="temperature.value"
              >
                {temperature?.toFixed(1)}
                <span className="text-xl ml-1">°C</span>
              </div>
              {meta && (
                <span
                  className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    background: `${meta.color}22`,
                    color: meta.color,
                    border: `1px solid ${meta.color}55`,
                  }}
                >
                  {meta.label}
                </span>
              )}
            </div>

            {/* Coordinates */}
            <div
              className="rounded-lg px-3 py-2"
              style={{
                background: "rgba(43, 52, 67, 0.4)",
                border: "1px solid rgba(43, 52, 67, 0.6)",
              }}
            >
              <p
                className="text-[10px] font-semibold tracking-widest mb-1"
                style={{ color: "#AAB4C3" }}
              >
                พิกัด
              </p>
              <p
                className="text-[12px] font-mono"
                style={{ color: "#E8EDF6" }}
                data-ocid="temperature.coords"
              >
                {coords!.lat.toFixed(4)}°, {coords!.lng.toFixed(4)}°
              </p>
            </div>

            {/* Save as pin */}
            <button
              type="button"
              onClick={onSavePin}
              className="w-full flex items-center justify-center gap-2 h-10 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: "linear-gradient(135deg, #3A87FF, #67D5FF)",
                color: "#070A10",
                border: "none",
              }}
              data-ocid="temperature.save_button"
            >
              <MapPin size={15} />
              บันทึกเป็นหมุด
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
