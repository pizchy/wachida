import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Pencil, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Pin } from "../backend.d";

const WEATHER_DATA = [40, 55, 35, 70, 60, 80, 65, 75, 50, 85, 72, 60];
const MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

interface FeatureDetailsPanelProps {
  pin: Pin | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: bigint, title: string, description: string) => void;
  onDelete: (id: bigint) => void;
}

export function FeatureDetailsPanel({
  pin,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: FeatureDetailsPanelProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (pin) {
      setTitle(pin.title);
      setDescription(pin.description);
      setEditing(false);
    }
  }, [pin]);

  const handleSave = () => {
    if (!pin) return;
    onUpdate(pin.id, title, description);
    setEditing(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed right-0 top-16 bottom-0 z-40 flex flex-col"
      style={{ width: 320 }}
      data-ocid="feature_details.panel"
    >
      <div
        className="flex flex-col h-full"
        style={{
          background: "rgba(20, 25, 34, 0.95)",
          backdropFilter: "blur(16px)",
          borderLeft: "1px solid rgba(43, 52, 67, 0.8)",
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(43, 52, 67, 0.6)" }}
        >
          <span
            className="text-[11px] font-semibold tracking-widest"
            style={{ color: "#AAB4C3" }}
          >
            รายละเอียดจุดสนใจ
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded flex items-center justify-center transition-colors hover:bg-white/5"
            style={{ color: "#AAB4C3" }}
            data-ocid="feature_details.close_button"
          >
            <X size={17} />
          </button>
        </div>

        {pin ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <MapPin size={12} style={{ color: "#FF5C7A" }} />
                {editing ? (
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-7 text-sm bg-white/5 border-white/10 text-white"
                    data-ocid="feature_details.title.input"
                  />
                ) : (
                  <h2
                    className="text-sm font-semibold"
                    style={{ color: "#E8EDF6" }}
                  >
                    {pin.title || "หมุดไม่มีชื่อ"}
                  </h2>
                )}
              </div>
              <p className="text-[10px] font-mono" style={{ color: "#AAB4C3" }}>
                {pin.latitude.toFixed(4)}°, {pin.longitude.toFixed(4)}°
              </p>
            </div>

            <div
              className="rounded-lg p-3 space-y-2"
              style={{
                background: "rgba(43, 52, 67, 0.3)",
                border: "1px solid rgba(43, 52, 67, 0.4)",
              }}
            >
              <p
                className="text-[9px] font-semibold tracking-widest mb-2"
                style={{ color: "#AAB4C3" }}
              >
                สถิติพื้นที่
              </p>
              {[
                { label: "ประชากร", value: 72, color: "#FF5C7A" },
                { label: "ดัชนีเศรษฐกิจ", value: 58, color: "#F2C94C" },
                { label: "ความสูง", value: 35, color: "#35C3B2" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[9px]" style={{ color: "#AAB4C3" }}>
                      {stat.label}
                    </span>
                    <span
                      className="text-[9px] font-mono"
                      style={{ color: stat.color }}
                    >
                      {stat.value}%
                    </span>
                  </div>
                  <div
                    className="h-1 rounded-full"
                    style={{ background: "rgba(43, 52, 67, 0.6)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${stat.value}%`,
                        background: stat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div
              className="rounded-lg p-3"
              style={{
                background: "rgba(43, 52, 67, 0.3)",
                border: "1px solid rgba(43, 52, 67, 0.4)",
              }}
            >
              <p
                className="text-[9px] font-semibold tracking-widest mb-2"
                style={{ color: "#AAB4C3" }}
              >
                แนวโน้มสภาพอากาศ
              </p>
              <div className="flex items-end gap-0.5 h-10">
                {WEATHER_DATA.map((v, i) => (
                  <div
                    key={MONTHS[i]}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${v}%`,
                      background: `rgba(58, 135, 255, ${0.4 + v / 200})`,
                    }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[8px]" style={{ color: "#AAB4C3" }}>
                  ม.ค.
                </span>
                <span className="text-[8px]" style={{ color: "#AAB4C3" }}>
                  ธ.ค.
                </span>
              </div>
            </div>

            <div>
              <p
                className="text-[9px] font-semibold tracking-widest mb-1.5"
                style={{ color: "#AAB4C3" }}
              >
                คำอธิบาย
              </p>
              {editing ? (
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="text-xs bg-white/5 border-white/10 text-white resize-none"
                  placeholder="เพิ่มคำอธิบาย..."
                  data-ocid="feature_details.description.textarea"
                />
              ) : (
                <p
                  className="text-[11px] leading-relaxed"
                  style={{ color: "#AAB4C3" }}
                >
                  {pin.description || "ยังไม่มีคำอธิบาย คลิก แก้ไข เพื่อเพิ่ม"}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div
            className="flex-1 flex items-center justify-center"
            data-ocid="feature_details.empty_state"
          >
            <p className="text-xs text-center" style={{ color: "#AAB4C3" }}>
              คลิกหมุดบนโลก
              <br />
              เพื่อดูรายละเอียด
            </p>
          </div>
        )}

        {pin && (
          <div
            className="flex gap-2 p-4 flex-shrink-0"
            style={{ borderTop: "1px solid rgba(43, 52, 67, 0.6)" }}
          >
            {editing ? (
              <>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="flex-1 h-11 text-sm"
                  style={{
                    background: "rgba(58, 135, 255, 0.2)",
                    border: "1px solid rgba(58, 135, 255, 0.4)",
                    color: "#3A87FF",
                  }}
                  data-ocid="feature_details.save.button"
                >
                  <Save size={11} className="mr-1" /> บันทึก
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(false)}
                  className="h-11 text-sm"
                  style={{ color: "#AAB4C3" }}
                  data-ocid="feature_details.cancel_button"
                >
                  ยกเลิก
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="flex-1 h-11 text-sm"
                  style={{
                    background: "rgba(43, 52, 67, 0.5)",
                    border: "1px solid rgba(43, 52, 67, 0.6)",
                    color: "#AAB4C3",
                  }}
                  data-ocid="feature_details.edit_button"
                >
                  <Pencil size={11} className="mr-1" /> แก้ไขหมุด
                </Button>
                <Button
                  size="sm"
                  onClick={() => onDelete(pin.id)}
                  className="h-11 text-sm"
                  style={{
                    background: "rgba(226, 90, 90, 0.1)",
                    border: "1px solid rgba(226, 90, 90, 0.4)",
                    color: "#E25A5A",
                  }}
                  data-ocid="feature_details.delete_button"
                >
                  <Trash2 size={11} />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
