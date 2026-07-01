import {
  Flame,
  Globe2,
  MapPin,
  Move,
  Ruler,
  Share2,
  Thermometer,
  ZoomIn,
} from "lucide-react";
import type { ToolMode } from "../types/globe";

const TOOLS: { id: ToolMode; label: string; icon: React.ReactNode }[] = [
  { id: "globe", label: "โลก 3 มิติ", icon: <Globe2 size={17} /> },
  { id: "pan", label: "เลื่อน", icon: <Move size={17} /> },
  { id: "zoom", label: "ซูม", icon: <ZoomIn size={17} /> },
  { id: "measure", label: "วัด", icon: <Ruler size={17} /> },
  { id: "pin", label: "ปักหมุด", icon: <MapPin size={17} /> },
  { id: "heat-risk", label: "พยากรณ์ความเสี่ยง", icon: <Flame size={17} /> },
  { id: "temperature", label: "วัดอุณหภูมิ", icon: <Thermometer size={17} /> },
  { id: "share", label: "แชร์", icon: <Share2 size={17} /> },
];

interface LayerToolbarProps {
  mode: ToolMode;
  onChange: (mode: ToolMode) => void;
}

export function LayerToolbar({ mode, onChange }: LayerToolbarProps) {
  return (
    <div
      className="fixed bottom-8 left-1/2 z-50 flex flex-col items-center gap-1.5"
      style={{ transform: "translateX(-50%)" }}
    >
      <span
        className="text-[11px] font-semibold tracking-widest"
        style={{ color: "#AAB4C3" }}
      >
        แถบเครื่องมือเลเยอร์
      </span>
      <div
        className="flex items-center gap-1 p-1.5 rounded-full"
        style={{
          background: "rgba(20, 25, 34, 0.9)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(43, 52, 67, 0.8)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
        data-ocid="toolbar.panel"
      >
        {TOOLS.map((tool) => (
          <button
            type="button"
            key={tool.id}
            onClick={() => onChange(tool.id)}
            title={tool.label}
            className="flex items-center gap-1.5 px-4 py-3 rounded-full text-sm font-medium transition-all"
            style={{
              background:
                mode === tool.id
                  ? "linear-gradient(135deg, rgba(58,135,255,0.25), rgba(103,213,255,0.15))"
                  : "transparent",
              color: mode === tool.id ? "#67D5FF" : "#AAB4C3",
              border:
                mode === tool.id
                  ? "1px solid rgba(58,135,255,0.4)"
                  : "1px solid transparent",
            }}
            data-ocid={`toolbar.${tool.id}.button`}
          >
            {tool.icon}
            <span className="hidden sm:inline">{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
