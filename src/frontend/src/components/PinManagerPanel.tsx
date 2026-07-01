import { MapPin, Pencil, Trash2, X } from "lucide-react";
import type { Pin } from "../backend.d";

interface PinManagerPanelProps {
  pins: Pin[];
  selectedPin: Pin | null;
  mode: string;
  onDropPin: () => void;
  onEditPin: () => void;
  onDeletePin: (id: bigint) => void;
  onSelectPin: (pin: Pin) => void;
}

export function PinManagerPanel({
  pins,
  selectedPin,
  mode,
  onDropPin,
  onEditPin,
  onDeletePin,
  onSelectPin,
}: PinManagerPanelProps) {
  return (
    <div
      className="glass-panel shadow-panel flex-shrink-0"
      style={{ width: 268 }}
      data-ocid="pinmanager.panel"
    >
      <div
        className="px-4 py-3"
        style={{ borderBottom: "1px solid rgba(43, 52, 67, 0.6)" }}
      >
        <span
          className="text-[11px] font-semibold tracking-widest"
          style={{ color: "#AAB4C3" }}
        >
          จัดการหมุด
        </span>
      </div>

      <div
        className="flex gap-1.5 p-3"
        style={{ borderBottom: "1px solid rgba(43, 52, 67, 0.4)" }}
      >
        <button
          type="button"
          onClick={onDropPin}
          className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded text-sm font-semibold transition-all"
          style={{
            background:
              mode === "pin"
                ? "rgba(58, 135, 255, 0.25)"
                : "rgba(43, 52, 67, 0.5)",
            border: `1px solid ${
              mode === "pin"
                ? "rgba(58, 135, 255, 0.6)"
                : "rgba(43, 52, 67, 0.6)"
            }`,
            color: mode === "pin" ? "#3A87FF" : "#AAB4C3",
          }}
          data-ocid="pinmanager.drop.button"
        >
          <MapPin size={14} />
          ปักหมุด
        </button>
        <button
          type="button"
          onClick={onEditPin}
          disabled={!selectedPin}
          className="flex items-center justify-center gap-1 px-3 py-2.5 rounded text-sm transition-all disabled:opacity-40"
          style={{
            background: "rgba(43, 52, 67, 0.5)",
            border: "1px solid rgba(43, 52, 67, 0.6)",
            color: "#AAB4C3",
          }}
          data-ocid="pinmanager.edit.button"
        >
          <Pencil size={14} />
          แก้ไข
        </button>
        <button
          type="button"
          onClick={() => selectedPin && onDeletePin(selectedPin.id)}
          disabled={!selectedPin}
          className="flex items-center justify-center gap-1 px-3 py-2.5 rounded text-sm transition-all disabled:opacity-40"
          style={{
            background: "rgba(226, 90, 90, 0.1)",
            border: "1px solid rgba(226, 90, 90, 0.4)",
            color: "#E25A5A",
          }}
          data-ocid="pinmanager.delete.button"
        >
          <Trash2 size={14} />
          ลบ
        </button>
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
        {pins.length === 0 ? (
          <div
            className="px-3 py-4 text-center"
            data-ocid="pinmanager.empty_state"
          >
            <MapPin
              size={16}
              className="mx-auto mb-1 opacity-30"
              style={{ color: "#AAB4C3" }}
            />
            <p className="text-[11px]" style={{ color: "#AAB4C3" }}>
              ยังไม่มีหมุด คลิกบนโลกเพื่อปักหมุด
            </p>
          </div>
        ) : (
          <div className="py-1">
            {pins.map((pin, i) => (
              <button
                type="button"
                key={pin.id.toString()}
                onClick={() => onSelectPin(pin)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors"
                style={{
                  background:
                    selectedPin?.id === pin.id
                      ? "rgba(43, 52, 67, 0.5)"
                      : "transparent",
                }}
                data-ocid={`pinmanager.item.${i + 1}`}
              >
                <MapPin size={13} style={{ color: "#FF5C7A", flexShrink: 0 }} />
                <span
                  className="text-[13px] flex-1 truncate"
                  style={{ color: "#E8EDF6" }}
                >
                  {pin.title || "หมุดไม่มีชื่อ"}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePin(pin.id);
                  }}
                  className="w-6 h-6 rounded flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                  style={{ color: "#AAB4C3" }}
                  data-ocid={`pinmanager.delete_button.${i + 1}`}
                >
                  <X size={12} />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
