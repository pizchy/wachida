import { ChevronRight, X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { LAYER_CATEGORIES } from "../lib/layerConfig";
import type { ActiveLayer, LayerId } from "../types/globe";

const MAX_LAYERS = 3;
const FLYOUT_WIDTH = 220;

interface OverlaysPanelProps {
  activeLayers: ActiveLayer[];
  onChange: (layers: ActiveLayer[]) => void;
}

interface FlyoutPos {
  top: number;
  left: number;
}

export function OverlaysPanel({ activeLayers, onChange }: OverlaysPanelProps) {
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const categoryButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [flyoutPos, setFlyoutPos] = useState<FlyoutPos>({ top: 0, left: 0 });

  // Calculate flyout position using fixed positioning
  useLayoutEffect(() => {
    if (!openCategoryId) return;
    const btn = categoryButtonRefs.current.get(openCategoryId);
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const panelRect = panelRef.current?.getBoundingClientRect();
    const panelRight = panelRect ? panelRect.right : rect.right;
    // Place flyout to the right of the main panel
    let left = panelRight + 8;
    // Clamp so flyout never overflows viewport
    const maxLeft = window.innerWidth - FLYOUT_WIDTH - 8;
    if (left > maxLeft) left = maxLeft;
    // Top aligns with the button, but clamped to viewport
    let top = rect.top;
    const maxTop = window.innerHeight - 480 - 8;
    if (top > maxTop) top = Math.max(8, maxTop);
    setFlyoutPos({ top, left });
  }, [openCategoryId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenCategoryId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close flyout when clicking outside
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      const panel = panelRef.current;
      const flyout = document.getElementById("overlay-flyout");
      if (
        panel &&
        !panel.contains(target) &&
        flyout &&
        !flyout.contains(target)
      ) {
        setOpenCategoryId(null);
      }
    }
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function toggleCategory(id: string) {
    setOpenCategoryId((prev) => (prev === id ? null : id));
  }

  function isLayerActive(id: LayerId) {
    return activeLayers.some((l) => l.id === id);
  }

  function handleLayerToggle(layerId: LayerId) {
    if (isLayerActive(layerId)) {
      // Remove
      onChange(activeLayers.filter((l) => l.id !== layerId));
    } else {
      // Add (cap at MAX_LAYERS — replace oldest if at limit)
      const newLayer: ActiveLayer = { id: layerId, opacity: 1.0 };
      if (activeLayers.length >= MAX_LAYERS) {
        onChange([...activeLayers.slice(1), newLayer]);
      } else {
        onChange([...activeLayers, newLayer]);
      }
    }
  }

  function handleOpacityChange(id: LayerId, opacity: number) {
    onChange(activeLayers.map((l) => (l.id === id ? { ...l, opacity } : l)));
  }

  function handleRemoveLayer(id: LayerId) {
    onChange(activeLayers.filter((l) => l.id !== id));
  }

  function handleClearAll() {
    onChange([]);
    setOpenCategoryId(null);
  }

  const openCategory = LAYER_CATEGORIES.find((c) => c.id === openCategoryId);

  // Get layer color from config
  function getLayerColor(id: LayerId): string {
    for (const cat of LAYER_CATEGORIES) {
      const found = cat.layers.find((l) => l.id === id);
      if (found) return found.color;
    }
    return "#3A87FF";
  }

  function getLayerLabel(id: LayerId): string {
    for (const cat of LAYER_CATEGORIES) {
      const found = cat.layers.find((l) => l.id === id);
      if (found) return found.label;
    }
    return id;
  }

  return (
    <>
      <div
        ref={panelRef}
        className="flex-shrink-0"
        style={{ width: 220 }}
        data-ocid="overlays.panel"
      >
        {/* Main panel */}
        <div className="glass-panel shadow-panel" style={{ width: 220 }}>
          {/* Header */}
          <div
            className="px-4 py-3 sticky top-0 z-10"
            style={{
              borderBottom: "1px solid rgba(43, 52, 67, 0.6)",
              background: "rgba(12, 16, 24, 0.95)",
            }}
          >
            <span
              className="text-[11px] font-semibold tracking-widest"
              style={{ color: "#AAB4C3" }}
            >
              การแสดงผลข้อมูล
            </span>
          </div>

          {/* Active layers section */}
          {activeLayers.length > 0 && (
            <div
              className="px-3 py-2"
              style={{ borderBottom: "1px solid rgba(43,52,67,0.5)" }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="text-[10px] font-semibold tracking-wider"
                  style={{ color: "#6B7A8F" }}
                >
                  ใช้งาน ({activeLayers.length}/{MAX_LAYERS})
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[10px] transition-colors hover:text-red-400"
                  style={{ color: "#4A5568" }}
                  data-ocid="overlays.clear_all.button"
                >
                  ล้างทั้งหมด
                </button>
              </div>
              {activeLayers.map((layer) => (
                <div key={layer.id} className="mb-2 last:mb-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div
                      className="w-2 h-2 rounded-sm flex-shrink-0"
                      style={{ background: getLayerColor(layer.id) }}
                    />
                    <span
                      className="text-[11px] flex-1 truncate"
                      style={{ color: "#C8D4E6" }}
                    >
                      {getLayerLabel(layer.id)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLayer(layer.id)}
                      className="flex-shrink-0 w-4 h-4 flex items-center justify-center rounded transition-colors hover:bg-white/10"
                      style={{ color: "#4A5568" }}
                      data-ocid={`overlays.${layer.id}.delete_button`}
                    >
                      <X size={10} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={layer.opacity}
                      onChange={(e) =>
                        handleOpacityChange(
                          layer.id,
                          Number.parseFloat(e.target.value),
                        )
                      }
                      className="flex-1 h-1 cursor-pointer"
                      style={{ accentColor: getLayerColor(layer.id) }}
                      data-ocid={`overlays.${layer.id}.input`}
                    />
                    <span
                      className="text-[10px] font-mono w-7 text-right"
                      style={{ color: "#6B7A8F" }}
                    >
                      {Math.round(layer.opacity * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* None row — compact */}
          <button
            type="button"
            onClick={handleClearAll}
            className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-white/5"
            style={{
              background:
                activeLayers.length === 0
                  ? "rgba(242, 237, 228, 0.06)"
                  : "transparent",
              borderLeft:
                activeLayers.length === 0
                  ? "2px solid rgba(242,237,228,0.4)"
                  : "2px solid transparent",
              borderBottom: "1px solid rgba(43, 52, 67, 0.5)",
            }}
            data-ocid="overlays.none.toggle"
          >
            <div
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{
                background:
                  activeLayers.length === 0
                    ? "rgba(242,237,228,0.7)"
                    : "rgba(107,122,143,0.3)",
              }}
            />
            <span
              className="text-[11px]"
              style={{
                color: activeLayers.length === 0 ? "#D0C8BC" : "#4A5568",
              }}
            >
              ไม่มี
            </span>
          </button>

          {/* Category rows */}
          <div className="py-1">
            {LAYER_CATEGORIES.map((category) => {
              const isOpen = openCategoryId === category.id;
              const hasActive = category.layers.some((l) =>
                isLayerActive(l.id),
              );
              const activeCount = category.layers.filter((l) =>
                isLayerActive(l.id),
              ).length;

              return (
                <button
                  key={category.id}
                  ref={(el) => {
                    if (el) categoryButtonRefs.current.set(category.id, el);
                    else categoryButtonRefs.current.delete(category.id);
                  }}
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                  style={{
                    background: isOpen
                      ? "rgba(58, 135, 255, 0.08)"
                      : "transparent",
                    borderLeft: isOpen
                      ? "2px solid rgba(58,135,255,0.6)"
                      : "2px solid transparent",
                    minHeight: 44,
                  }}
                  data-ocid={`overlays.${category.id}.toggle`}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{
                      background: hasActive
                        ? "#3A87FF"
                        : isOpen
                          ? "rgba(58,135,255,0.4)"
                          : "rgba(107,122,143,0.3)",
                    }}
                  />
                  <span
                    className="text-[12px] font-medium flex-1"
                    style={{
                      color: hasActive
                        ? "#E8EDF6"
                        : isOpen
                          ? "#B8C8E8"
                          : "#6B7A8F",
                    }}
                  >
                    {category.label}
                  </span>
                  {activeCount > 0 && (
                    <span
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        background: "rgba(58,135,255,0.2)",
                        color: "#3A87FF",
                      }}
                    >
                      {activeCount}
                    </span>
                  )}
                  <ChevronRight
                    size={12}
                    style={{
                      color: isOpen ? "#3A87FF" : "#4A5568",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.15s ease",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Flyout panel — position: fixed so it never clips off-screen */}
      {openCategory && (
        <div
          id="overlay-flyout"
          className="glass-panel shadow-panel"
          style={{
            position: "fixed",
            top: flyoutPos.top,
            left: flyoutPos.left,
            width: FLYOUT_WIDTH,
            zIndex: 9999,
            maxHeight: "min(480px, 70vh)",
            overflowY: "auto",
          }}
          data-ocid="overlays.flyout.panel"
        >
          <div
            className="px-4 py-3 sticky top-0 z-10"
            style={{
              borderBottom: "1px solid rgba(43, 52, 67, 0.6)",
              background: "rgba(12, 16, 24, 0.97)",
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-semibold tracking-widest"
                style={{ color: "#AAB4C3" }}
              >
                {openCategory.label.toUpperCase()}
              </span>
              {activeLayers.length >= MAX_LAYERS && (
                <span className="text-[10px]" style={{ color: "#FF8A3D" }}>
                  สูงสุด {MAX_LAYERS} เลเยอร์
                </span>
              )}
            </div>
          </div>

          <div className="py-1">
            {openCategory.layers.map((layer) => {
              const isActive = isLayerActive(layer.id as LayerId);
              const atLimit = !isActive && activeLayers.length >= MAX_LAYERS;

              return (
                <button
                  type="button"
                  key={layer.id}
                  onClick={() =>
                    !atLimit && handleLayerToggle(layer.id as LayerId)
                  }
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                  style={{
                    background: isActive
                      ? "rgba(43, 52, 67, 0.5)"
                      : "transparent",
                    borderLeft: isActive
                      ? `2px solid ${layer.color}`
                      : "2px solid transparent",
                    opacity: atLimit ? 0.4 : 1,
                    cursor: atLimit ? "not-allowed" : "pointer",
                    minHeight: 44,
                  }}
                  data-ocid={`overlays.${layer.id}.toggle`}
                >
                  {/* Checkbox indicator */}
                  <div
                    className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center"
                    style={{
                      border: isActive
                        ? `2px solid ${layer.color}`
                        : "2px solid rgba(107,122,143,0.4)",
                      background: isActive ? `${layer.color}33` : "transparent",
                    }}
                  >
                    {isActive && (
                      <div
                        className="w-2 h-2 rounded-sm"
                        style={{ background: layer.color }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[13px] flex-1"
                    style={{
                      color: isActive ? "#E8EDF6" : "#AAB4C3",
                    }}
                  >
                    {layer.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
