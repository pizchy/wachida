import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building2,
  Download,
  Flame,
  Printer,
  Save,
  Share2,
  Thermometer,
  Trees,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useCreateHeatRiskArea } from "../hooks/useQueries";
import {
  type HeatRiskReportData,
  downloadHeatRiskPdf,
  printHeatRiskPdf,
} from "../lib/pdfGenerator";
import type { HeatRiskLevel, HeatRiskResult } from "../types/heatRisk";

interface HeatRiskCenter {
  lat: number;
  lng: number;
}

interface HeatRiskReportPanelProps {
  heatRiskCenter: HeatRiskCenter | null;
  heatRiskRadius: number;
  heatRiskResult: HeatRiskResult | null;
  onClose: () => void;
  visible: boolean;
  // Factor inputs used by App.tsx to compute the result. Passed through so the
  // factor-breakdown progress bars can render the same values the engine saw.
  vegetationFactor?: number;
  buildingFactor?: number;
  baseTemp?: number;
  // Community density factor (0–1) for the 4th factor bar "ความหนาแน่นชุมชน".
  // App.tsx wires this through from the community-density layer state.
  communityDensityFactor?: number;
}

// Map a Thai risk level to its CSS token class + threshold label set.
const RISK_LEVEL_META: Record<
  HeatRiskLevel,
  { className: string; label: string }
> = {
  ต่ำ: { className: "risk-low", label: "ต่ำ" },
  ปานกลาง: { className: "risk-medium", label: "ปานกลาง" },
  สูง: { className: "risk-high", label: "สูง" },
  วิกฤต: { className: "risk-critical", label: "วิกฤต" },
};

// Threshold labels shared by all three factor progress bars.
const THRESHOLD_LABELS = ["ต่ำ", "กลาง", "สูง", "วิกฤต"];

function formatRadius(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} กม.`;
  }
  return `${Math.round(meters)} ม.`;
}

// Convert a 0–1 factor value to a 0–100 contribution percentage for the bar.
function factorPercent(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 100);
}

// Pick a Thai threshold label for a 0–100 factor contribution.
function thresholdFor(percent: number): string {
  if (percent <= 25) return THRESHOLD_LABELS[0];
  if (percent <= 50) return THRESHOLD_LABELS[1];
  if (percent <= 75) return THRESHOLD_LABELS[2];
  return THRESHOLD_LABELS[3];
}

// Pick the risk-level CSS class for a factor contribution bar.
function factorRiskClass(percent: number): string {
  if (percent <= 25) return "risk-low";
  if (percent <= 50) return "risk-medium";
  if (percent <= 75) return "risk-high";
  return "risk-critical";
}

export function HeatRiskReportPanel({
  heatRiskCenter,
  heatRiskRadius,
  heatRiskResult,
  onClose,
  visible,
  vegetationFactor = 0.4,
  buildingFactor = 0.6,
  baseTemp = 35,
  communityDensityFactor = 0.5,
}: HeatRiskReportPanelProps) {
  const createHeatRiskArea = useCreateHeatRiskArea();
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [shareState, setShareState] = useState<"idle" | "saving">("idle");
  const [pdfState, setPdfState] = useState<"idle" | "working">("idle");

  // Reset the title input whenever a new analysis center is picked.
  useEffect(() => {
    if (heatRiskCenter) {
      setTitle(
        `พื้นที่วิเคราะห์ @ ${heatRiskCenter.lat.toFixed(4)},${heatRiskCenter.lng.toFixed(4)}`,
      );
    }
  }, [heatRiskCenter]);

  if (!visible || !heatRiskResult || !heatRiskCenter) return null;

  const levelMeta = RISK_LEVEL_META[heatRiskResult.riskLevel];

  const factors = [
    {
      icon: Thermometer,
      label: "อุณหภูมิพื้นฐาน",
      // Map 20–45°C base temp to 0–100 contribution (mirrors engine baseline).
      value: Math.min(1, Math.max(0, (baseTemp - 20) / 25)),
      display: `${baseTemp.toFixed(1)} °C`,
    },
    {
      icon: Trees,
      label: "พื้นที่สีเขียว",
      // Vegetation mitigates heat — invert so low coverage = high risk bar.
      value: 1 - Math.min(1, Math.max(0, vegetationFactor)),
      display: `${factorPercent(vegetationFactor)}%`,
    },
    {
      icon: Building2,
      label: "ความหนาแน่นอาคาร",
      value: Math.min(1, Math.max(0, buildingFactor)),
      display: `${factorPercent(buildingFactor)}%`,
    },
    {
      icon: Users,
      label: "ความหนาแน่นชุมชน",
      value: Math.min(1, Math.max(0, communityDensityFactor)),
      display: `${factorPercent(communityDensityFactor)}%`,
    },
  ];

  const handleSave = () => {
    if (!heatRiskCenter) return;
    setShareState("saving");
    const finalTitle =
      title.trim() ||
      `พื้นที่วิเคราะห์ @ ${heatRiskCenter.lat.toFixed(4)},${heatRiskCenter.lng.toFixed(4)}`;
    createHeatRiskArea.mutate(
      {
        input: {
          title: finalTitle,
          latitude: heatRiskCenter.lat,
          longitude: heatRiskCenter.lng,
          radiusMeters: heatRiskRadius,
        },
        riskScore: BigInt(heatRiskResult.riskScore),
        apparentTemp: heatRiskResult.apparentTemp,
        vegetationFactor,
        buildingFactor,
        communityDensityFactor,
        baseTemp,
        riskLevel: heatRiskResult.riskLevel,
        recommendedShelters: BigInt(heatRiskResult.recommendedShelters),
        recommendedGreenArea: heatRiskResult.recommendedGreenArea,
      },
      {
        onSuccess: () => {
          toast.success("บันทึกพื้นที่วิเคราะห์แล้ว");
          setSaving(false);
          setShareState("idle");
        },
        onError: () => {
          toast.error("บันทึกไม่สำเร็จ กรุณาลองอีกครั้ง");
          setShareState("idle");
        },
      },
    );
  };

  const handleShare = async () => {
    if (!heatRiskResult || !heatRiskCenter) return;
    const summary = [
      "รายงานความเสี่ยงจากความร้อน",
      `พิกัด: ${heatRiskCenter.lat.toFixed(4)}, ${heatRiskCenter.lng.toFixed(4)}`,
      `รัศมี: ${formatRadius(heatRiskRadius)}`,
      `คะแนนความเสี่ยง: ${heatRiskResult.riskScore}/100 (${heatRiskResult.riskLevel})`,
      `อุณหภูมิที่รับรู้: ${heatRiskResult.apparentTemp.toFixed(1)} °C`,
      `จำนวนศูนย์หลบร้อนที่ควรตั้ง: ${heatRiskResult.recommendedShelters} จุด`,
      `พื้นที่ที่ควรเพิ่มต้นไม้: ${heatRiskResult.recommendedGreenArea}%`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(summary);
      toast.success("คัดลอกรายงานไปยังคลิปบอร์ดแล้ว");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };

  // Build the typed payload the PDF generator expects from the panel's current
  // state. Factor contributions mirror the bars shown above so the printed
  // document matches what the user sees on screen.
  const buildPdfData = (): HeatRiskReportData => {
    const tempContribution =
      Math.min(1, Math.max(0, (baseTemp - 20) / 25)) * 100;
    const vegContribution =
      (1 - Math.min(1, Math.max(0, vegetationFactor))) * 100;
    const bldContribution = Math.min(1, Math.max(0, buildingFactor)) * 100;
    const communityContribution =
      Math.min(1, Math.max(0, communityDensityFactor)) * 100;
    return {
      coordinates: { lat: heatRiskCenter.lat, lng: heatRiskCenter.lng },
      radiusMeters: heatRiskRadius,
      riskScore: heatRiskResult.riskScore,
      riskLevel: heatRiskResult.riskLevel,
      apparentTemp: heatRiskResult.apparentTemp,
      factors: {
        temperature: {
          valueC: baseTemp,
          contribution: tempContribution,
        },
        vegetation: {
          coveragePercent: factorPercent(vegetationFactor),
          contribution: vegContribution,
        },
        building: {
          densityPercent: factorPercent(buildingFactor),
          contribution: bldContribution,
        },
        community: {
          densityPercent: factorPercent(communityDensityFactor),
          contribution: communityContribution,
        },
      },
      recommendedShelters: heatRiskResult.recommendedShelters,
      recommendedGreenArea: heatRiskResult.recommendedGreenArea,
    };
  };

  const handleDownloadPdf = async () => {
    if (!heatRiskResult || !heatRiskCenter) return;
    setPdfState("working");
    try {
      await downloadHeatRiskPdf(buildPdfData());
      toast.success("สร้างไฟล์ PDF แล้ว");
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "สร้าง PDF ไม่สำเร็จ กรุณาลองอีกครั้ง",
      );
    } finally {
      setPdfState("idle");
    }
  };

  const handlePrintPdf = async () => {
    if (!heatRiskResult || !heatRiskCenter) return;
    setPdfState("working");
    try {
      await printHeatRiskPdf(buildPdfData());
      toast.success("เปิดหน้าต่างพิมพ์แล้ว");
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "เปิดหน้าต่างพิมพ์ไม่สำเร็จ",
      );
    } finally {
      setPdfState("idle");
    }
  };

  return (
    <div
      className="fixed right-0 top-16 bottom-0 z-40 flex flex-col"
      style={{ width: 360 }}
      data-ocid="heat_risk_report.panel"
    >
      <div
        className={`glass-panel flex flex-col h-full rounded-none border-l border-y-0 border-r-0 ${
          visible ? "slide-in-right" : "slide-out-right"
        }`}
      >
        {/* (1) Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(43, 52, 67, 0.6)" }}
        >
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-primary" />
            <span
              className="text-[11px] font-semibold tracking-widest"
              style={{ color: "#AAB4C3" }}
            >
              รายงานความเสี่ยง
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded flex items-center justify-center transition-colors hover:bg-white/5"
            style={{ color: "#AAB4C3" }}
            aria-label="ปิดรายงาน"
            data-ocid="heat_risk_report.close_button"
          >
            <X size={17} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* (2) Coordinates section */}
          <section data-ocid="heat_risk_report.coordinates.section">
            <p
              className="text-[9px] font-semibold tracking-widest mb-2"
              style={{ color: "#AAB4C3" }}
            >
              พิกัดและรัศมี
            </p>
            <div
              className="rounded-lg p-3 space-y-1.5"
              style={{
                background: "rgba(43, 52, 67, 0.3)",
                border: "1px solid rgba(43, 52, 67, 0.4)",
              }}
            >
              <div className="flex justify-between">
                <span className="text-[10px]" style={{ color: "#AAB4C3" }}>
                  ละติจูด
                </span>
                <span
                  className="text-[10px] font-mono"
                  style={{ color: "#E8EDF6" }}
                >
                  {heatRiskCenter.lat.toFixed(4)}°
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px]" style={{ color: "#AAB4C3" }}>
                  ลองจิจูด
                </span>
                <span
                  className="text-[10px] font-mono"
                  style={{ color: "#E8EDF6" }}
                >
                  {heatRiskCenter.lng.toFixed(4)}°
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px]" style={{ color: "#AAB4C3" }}>
                  รัศมีวิเคราะห์
                </span>
                <span
                  className="text-[10px] font-mono"
                  style={{ color: "#E8EDF6" }}
                >
                  {formatRadius(heatRiskRadius)}
                </span>
              </div>
            </div>
          </section>

          {/* (3) Risk score section */}
          <section data-ocid="heat_risk_report.score.section">
            <p
              className="text-[9px] font-semibold tracking-widest mb-2"
              style={{ color: "#AAB4C3" }}
            >
              คะแนนความเสี่ยง
            </p>
            <div
              className="rounded-lg p-4 flex items-center justify-between"
              style={{
                background: "rgba(43, 52, 67, 0.3)",
                border: "1px solid rgba(43, 52, 67, 0.4)",
              }}
            >
              <div className="flex flex-col">
                <span
                  className="text-4xl font-bold leading-none"
                  style={{ color: "#E8EDF6" }}
                >
                  {heatRiskResult.riskScore}
                </span>
                <span className="text-[10px] mt-1" style={{ color: "#AAB4C3" }}>
                  / 100
                </span>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${levelMeta.className}`}
                  data-ocid="heat_risk_report.risk_level.badge"
                >
                  {levelMeta.label}
                </span>
                <div className="flex items-center gap-1">
                  <Thermometer size={12} style={{ color: "#FF8A3D" }} />
                  <span
                    className="text-[11px] font-mono"
                    style={{ color: "#E8EDF6" }}
                  >
                    {heatRiskResult.apparentTemp.toFixed(1)} °C
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* (4) Factor breakdown */}
          <section data-ocid="heat_risk_report.factors.section">
            <p
              className="text-[9px] font-semibold tracking-widest mb-2"
              style={{ color: "#AAB4C3" }}
            >
              ปัจจัยที่มีผลต่อความเสี่ยง
            </p>
            <div
              className="rounded-lg p-3 space-y-3"
              style={{
                background: "rgba(43, 52, 67, 0.3)",
                border: "1px solid rgba(43, 52, 67, 0.4)",
              }}
            >
              {factors.map((factor, idx) => {
                const percent = factorPercent(factor.value);
                const riskClass = factorRiskClass(percent);
                const Icon = factor.icon;
                return (
                  <div
                    key={factor.label}
                    data-ocid={`heat_risk_report.factor.item.${idx + 1}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Icon size={11} style={{ color: "#AAB4C3" }} />
                        <span
                          className="text-[10px]"
                          style={{ color: "#E8EDF6" }}
                        >
                          {factor.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[9px] font-mono"
                          style={{ color: "#AAB4C3" }}
                        >
                          {factor.display}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${riskClass}`}
                        >
                          {thresholdFor(percent)}
                        </span>
                      </div>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: "rgba(43, 52, 67, 0.6)" }}
                    >
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${riskClass}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {/* Threshold legend */}
              <div className="flex justify-between pt-1">
                {THRESHOLD_LABELS.map((label) => (
                  <span
                    key={label}
                    className="text-[8px]"
                    style={{ color: "#AAB4C3" }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* (5) Resource allocation recommendations */}
          <section data-ocid="heat_risk_report.recommendations.section">
            <p
              className="text-[9px] font-semibold tracking-widest mb-2"
              style={{ color: "#AAB4C3" }}
            >
              คำแนะนำการจัดสรรทรัพยากร
            </p>
            <div className="space-y-2">
              <div
                className="rounded-lg p-3 flex items-center gap-3"
                style={{
                  background: "rgba(58, 135, 255, 0.08)",
                  border: "1px solid rgba(58, 135, 255, 0.25)",
                }}
                data-ocid="heat_risk_report.shelters.card"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(58, 135, 255, 0.15)",
                  }}
                >
                  <Flame size={16} style={{ color: "#3A87FF" }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px]" style={{ color: "#AAB4C3" }}>
                    จำนวนศูนย์หลบร้อนที่ควรตั้ง
                  </p>
                  <p
                    className="text-base font-semibold"
                    style={{ color: "#E8EDF6" }}
                  >
                    {heatRiskResult.recommendedShelters} จุด
                  </p>
                </div>
              </div>
              <div
                className="rounded-lg p-3 flex items-center gap-3"
                style={{
                  background: "rgba(56, 181, 106, 0.08)",
                  border: "1px solid rgba(56, 181, 106, 0.25)",
                }}
                data-ocid="heat_risk_report.green_area.card"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    background: "rgba(56, 181, 106, 0.15)",
                  }}
                >
                  <Trees size={16} style={{ color: "#38B56A" }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px]" style={{ color: "#AAB4C3" }}>
                    พื้นที่ที่ควรเพิ่มต้นไม้
                  </p>
                  <p
                    className="text-base font-semibold"
                    style={{ color: "#E8EDF6" }}
                  >
                    {heatRiskResult.recommendedGreenArea}%
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* (6) Action buttons */}
        <div
          className="flex flex-col gap-2 p-4 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(43, 52, 67, 0.6)" }}
        >
          {saving ? (
            <div className="space-y-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ชื่อพื้นที่วิเคราะห์"
                className="h-10 text-sm bg-white/5 border-white/10 text-white"
                data-ocid="heat_risk_report.title.input"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={shareState === "saving"}
                  className="flex-1 h-10 text-sm"
                  data-ocid="heat_risk_report.save_button"
                >
                  <Save size={12} className="mr-1" />
                  {shareState === "saving" ? "กำลังบันทึก..." : "ยืนยันบันทึก"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSaving(false)}
                  className="h-10 text-sm"
                  style={{ color: "#AAB4C3" }}
                  data-ocid="heat_risk_report.cancel_button"
                >
                  ยกเลิก
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setSaving(true)}
                  className="flex-1 h-10 text-sm"
                  style={{
                    background: "rgba(58, 135, 255, 0.2)",
                    border: "1px solid rgba(58, 135, 255, 0.4)",
                    color: "#3A87FF",
                  }}
                  data-ocid="heat_risk_report.open_save_button"
                >
                  <Save size={12} className="mr-1" />
                  บันทึกพื้นที่วิเคราะห์
                </Button>
                <Button
                  size="sm"
                  onClick={handleShare}
                  className="flex-1 h-10 text-sm"
                  style={{
                    background: "rgba(43, 52, 67, 0.5)",
                    border: "1px solid rgba(43, 52, 67, 0.6)",
                    color: "#AAB4C3",
                  }}
                  data-ocid="heat_risk_report.share_button"
                >
                  <Share2 size={12} className="mr-1" />
                  แชร์รายงาน
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleDownloadPdf}
                  disabled={pdfState === "working"}
                  className="flex-1 h-10 text-sm"
                  style={{
                    background: "rgba(255, 138, 61, 0.18)",
                    border: "1px solid rgba(255, 138, 61, 0.4)",
                    color: "#FF8A3D",
                  }}
                  data-ocid="heat_risk_report.pdf_button"
                >
                  <Download size={12} className="mr-1" />
                  {pdfState === "working" ? "กำลังสร้าง..." : "สร้าง PDF"}
                </Button>
                <Button
                  size="sm"
                  onClick={handlePrintPdf}
                  disabled={pdfState === "working"}
                  className="flex-1 h-10 text-sm"
                  style={{
                    background: "rgba(43, 52, 67, 0.5)",
                    border: "1px solid rgba(43, 52, 67, 0.6)",
                    color: "#AAB4C3",
                  }}
                  data-ocid="heat_risk_report.print_button"
                >
                  <Printer size={12} className="mr-1" />
                  พิมพ์
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
