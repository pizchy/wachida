// Client-side Thai-language PDF generator for heat-risk reports.
// Uses jsPDF with an embedded Sarabun font (Thai-compatible) so all labels,
// factor names, and recommendations render correctly in the exported PDF.
//
// The generator is pure with respect to the report data: it accepts a typed
// HeatRiskReportData object and returns a jsPDF document instance. The caller
// decides whether to save, open, or print it.

import { jsPDF } from "jspdf";

import type { HeatRiskLevel } from "./heatRiskEngine";

// A nearby wildfire point shown in the report's wildfire section.
export interface WildfirePoint {
  lat: number;
  lng: number;
  distanceKm: number;
  intensityLabel: string;
}

// A single temperature measurement shown in the report's measurements section.
export interface TemperatureMeasurement {
  label: string;
  valueC: number;
  timestamp: string;
}

// Full payload accepted by generateHeatRiskPdf. The panel builds this from its
// current state plus any optional wildfire / measurement data it has on hand.
export interface HeatRiskReportData {
  coordinates: { lat: number; lng: number };
  radiusMeters: number;
  riskScore: number;
  riskLevel: HeatRiskLevel;
  apparentTemp: number;
  factors: {
    temperature: { valueC: number; contribution: number };
    vegetation: { coveragePercent: number; contribution: number };
    building: { densityPercent: number; contribution: number };
    community: { densityPercent: number; contribution: number };
  };
  recommendedShelters: number;
  recommendedGreenArea: number;
  wildfirePoints?: WildfirePoint[];
  temperatureMeasurements?: TemperatureMeasurement[];
  generatedAt?: Date;
}

// Layout constants — A4 portrait with comfortable margins for printing.
const PAGE_WIDTH = 210; // mm (A4)
const PAGE_HEIGHT = 297;
const MARGIN_X = 18;
const MARGIN_TOP = 18;
const MARGIN_BOTTOM = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

// Color palette — kept as RGB tuples so jsPDF's setTextColor / setDrawColor can
// consume them directly. Tuned for print legibility on white paper.
const COLOR = {
  ink: [30, 36, 48] as [number, number, number],
  muted: [110, 120, 135] as [number, number, number],
  accent: [58, 135, 255] as [number, number, number],
  rule: [200, 207, 218] as [number, number, number],
  low: [56, 181, 106] as [number, number, number],
  medium: [218, 165, 32] as [number, number, number],
  high: [220, 130, 50] as [number, number, number],
  critical: [200, 60, 40] as [number, number, number],
  shelterBg: [232, 238, 252] as [number, number, number],
  greenBg: [232, 245, 238] as [number, number, number],
};

// Cache the embedded font binary so repeated generations don't re-fetch.
let fontCache: { regular: string; bold: string } | null = null;

// Fetch the Sarabun TTF files and convert to base64 for jsPDF.addFileToVFS.
// jsPDF needs the raw font bytes registered under a virtual filename before
// addFont can reference them. We fetch from the app's public assets folder.
async function loadSarabunFont(): Promise<{ regular: string; bold: string }> {
  if (fontCache) return fontCache;
  const [regularRes, boldRes] = await Promise.all([
    fetch("/assets/fonts/Sarabun-Regular.ttf"),
    fetch("/assets/fonts/Sarabun-Bold.ttf"),
  ]);
  if (!regularRes.ok || !boldRes.ok) {
    throw new Error("ไม่สามารถโหลดฟอนต์ Sarabun สำหรับ PDF ได้");
  }
  const regularBytes = await regularRes.arrayBuffer();
  const boldBytes = await boldRes.arrayBuffer();
  fontCache = {
    regular: arrayBufferToBase64(regularBytes),
    bold: arrayBufferToBase64(boldBytes),
  };
  return fontCache;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000; // avoid call-stack overflow on large arrays
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Pick the RGB tuple for a risk level (used for the score badge + factor bars).
function riskColor(level: HeatRiskLevel): [number, number, number] {
  switch (level) {
    case "ต่ำ":
      return COLOR.low;
    case "ปานกลาง":
      return COLOR.medium;
    case "สูง":
      return COLOR.high;
    case "วิกฤต":
      return COLOR.critical;
    default:
      return COLOR.muted;
  }
}

function formatRadius(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} กม.`;
  return `${Math.round(meters)} ม.`;
}

function formatThaiDate(date: Date): string {
  // Buddhist-era year is what Thai readers expect on official documents.
  const beYear = date.getFullYear() + 543;
  const months = [
    "มกราคม",
    "กุมภาพันธ์",
    "มีนาคม",
    "เมษายน",
    "พฤษภาคม",
    "มิถุนายน",
    "กรกฎาคม",
    "สิงหาคม",
    "กันยายน",
    "ตุลาคม",
    "พฤศจิกายน",
    "ธันวาคม",
  ];
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${date.getDate()} ${months[date.getMonth()]} ${beYear} เวลา ${hh}:${mm} น.`;
}

// A small cursor helper so each section can render without manually tracking
// the y position across the whole document.
interface RenderCtx {
  doc: jsPDF;
  y: number;
}

function ensureSpace(ctx: RenderCtx, needed: number): void {
  if (ctx.y + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
    ctx.doc.addPage();
    ctx.y = MARGIN_TOP;
  }
}

function sectionTitle(ctx: RenderCtx, title: string): void {
  ensureSpace(ctx, 14);
  ctx.doc.setFont("sarabun", "bold");
  ctx.doc.setFontSize(12);
  ctx.doc.setTextColor(...COLOR.ink);
  ctx.doc.text(title, MARGIN_X, ctx.y);
  ctx.y += 5;
  // Thin rule under the title.
  ctx.doc.setDrawColor(...COLOR.rule);
  ctx.doc.setLineWidth(0.3);
  ctx.doc.line(MARGIN_X, ctx.y, MARGIN_X + CONTENT_WIDTH, ctx.y);
  ctx.y += 6;
}

function labelValue(
  ctx: RenderCtx,
  label: string,
  value: string,
  opts: { valueColor?: [number, number, number]; bold?: boolean } = {},
): void {
  ensureSpace(ctx, 6);
  ctx.doc.setFont("sarabun", "normal");
  ctx.doc.setFontSize(10.5);
  ctx.doc.setTextColor(...COLOR.muted);
  ctx.doc.text(label, MARGIN_X, ctx.y);
  ctx.doc.setFont("sarabun", opts.bold ? "bold" : "normal");
  ctx.doc.setTextColor(...(opts.valueColor ?? COLOR.ink));
  ctx.doc.text(value, MARGIN_X + 60, ctx.y, { align: "left" });
  ctx.y += 5.5;
}

// Render a single factor row: label + value + a horizontal contribution bar.
function factorRow(
  ctx: RenderCtx,
  label: string,
  displayValue: string,
  contribution: number, // 0–100
): void {
  ensureSpace(ctx, 12);
  const barX = MARGIN_X + 95;
  const barWidth = CONTENT_WIDTH - 95 - 22;
  const barY = ctx.y - 3;
  const barHeight = 4;

  ctx.doc.setFont("sarabun", "normal");
  ctx.doc.setFontSize(10.5);
  ctx.doc.setTextColor(...COLOR.ink);
  ctx.doc.text(label, MARGIN_X, ctx.y);
  ctx.doc.setTextColor(...COLOR.muted);
  ctx.doc.text(displayValue, MARGIN_X + 70, ctx.y, { align: "left" });

  // Bar background.
  ctx.doc.setFillColor(...COLOR.rule);
  ctx.doc.roundedRect(barX, barY, barWidth, barHeight, 1.5, 1.5, "F");
  // Bar fill — color follows the contribution severity.
  const fillWidth = (barWidth * Math.min(100, Math.max(0, contribution))) / 100;
  const color =
    contribution <= 25
      ? COLOR.low
      : contribution <= 50
        ? COLOR.medium
        : contribution <= 75
          ? COLOR.high
          : COLOR.critical;
  ctx.doc.setFillColor(...color);
  if (fillWidth > 0.5) {
    ctx.doc.roundedRect(barX, barY, fillWidth, barHeight, 1.5, 1.5, "F");
  }
  // Percentage label at the end of the bar.
  ctx.doc.setFont("sarabun", "normal");
  ctx.doc.setFontSize(9);
  ctx.doc.setTextColor(...COLOR.muted);
  ctx.doc.text(
    `${Math.round(contribution)}%`,
    MARGIN_X + CONTENT_WIDTH,
    ctx.y,
    {
      align: "right",
    },
  );
  ctx.y += 8;
}

/**
 * Build a Thai-language A4 PDF from a HeatRiskReportData payload.
 * Returns the jsPDF document so the caller can save / open / print it.
 */
export async function generateHeatRiskPdf(
  data: HeatRiskReportData,
): Promise<jsPDF> {
  const { regular, bold } = await loadSarabunFont();
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  // Register the Sarabun font with jsPDF's virtual file system.
  doc.addFileToVFS("Sarabun-Regular.ttf", regular);
  doc.addFileToVFS("Sarabun-Bold.ttf", bold);
  doc.addFont("Sarabun-Regular.ttf", "sarabun", "normal");
  doc.addFont("Sarabun-Bold.ttf", "sarabun", "bold");
  doc.setFont("sarabun", "normal");

  const ctx: RenderCtx = { doc, y: MARGIN_TOP };
  const generatedAt = data.generatedAt ?? new Date();

  // ── Title header ──────────────────────────────────────────────────────
  doc.setFillColor(...COLOR.accent);
  doc.rect(0, 0, PAGE_WIDTH, 4, "F");
  doc.setFont("sarabun", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COLOR.ink);
  doc.text("รายงานการวิเคราะห์ความเสี่ยงจากความร้อน", MARGIN_X, ctx.y + 6);
  ctx.y += 12;

  // Date/time of generation.
  doc.setFont("sarabun", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR.muted);
  doc.text(`สร้างเมื่อ: ${formatThaiDate(generatedAt)}`, MARGIN_X, ctx.y);
  ctx.y += 8;
  doc.setDrawColor(...COLOR.rule);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, ctx.y, MARGIN_X + CONTENT_WIDTH, ctx.y);
  ctx.y += 6;

  // ── Coordinates section ───────────────────────────────────────────────
  sectionTitle(ctx, "พิกัด");
  labelValue(ctx, "ละติจูด", `${data.coordinates.lat.toFixed(4)}°`);
  labelValue(ctx, "ลองจิจูด", `${data.coordinates.lng.toFixed(4)}°`);
  labelValue(ctx, "รัศมีวิเคราะห์", formatRadius(data.radiusMeters));
  ctx.y += 3;

  // ── Risk score + level ────────────────────────────────────────────────
  sectionTitle(ctx, "คะแนนความเสี่ยงและระดับความเสี่ยง");
  ensureSpace(ctx, 14);
  const scoreColor = riskColor(data.riskLevel);
  // Score badge box.
  doc.setFillColor(...scoreColor);
  doc.roundedRect(MARGIN_X, ctx.y - 4, 22, 12, 2, 2, "F");
  doc.setFont("sarabun", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(String(data.riskScore), MARGIN_X + 11, ctx.y + 4, {
    align: "center",
  });
  // Score label next to badge.
  doc.setFont("sarabun", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR.muted);
  doc.text("/ 100", MARGIN_X + 25, ctx.y + 4);
  // Risk level label.
  doc.setFont("sarabun", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...COLOR.ink);
  doc.text(`ระดับความเสี่ยง: ${data.riskLevel}`, MARGIN_X + 55, ctx.y + 4);
  ctx.y += 12;

  // ── Apparent temperature ──────────────────────────────────────────────
  sectionTitle(ctx, "อุณหภูมิที่รับรู้");
  labelValue(ctx, "อุณหภูมิที่รับรู้", `${data.apparentTemp.toFixed(1)} °C`, {
    bold: true,
    valueColor: COLOR.high,
  });
  ctx.y += 3;

  // ── Factor breakdown table ────────────────────────────────────────────
  sectionTitle(ctx, "การวิเคราะห์ปัจจัย");
  factorRow(
    ctx,
    "อุณหภูมิพื้นฐาน",
    `${data.factors.temperature.valueC.toFixed(1)} °C`,
    data.factors.temperature.contribution,
  );
  factorRow(
    ctx,
    "พื้นที่สีเขียว",
    `${data.factors.vegetation.coveragePercent}%`,
    data.factors.vegetation.contribution,
  );
  factorRow(
    ctx,
    "ความหนาแน่นอาคาร",
    `${data.factors.building.densityPercent}%`,
    data.factors.building.contribution,
  );
  factorRow(
    ctx,
    "ความหนาแน่นชุมชน",
    `${data.factors.community.densityPercent}%`,
    data.factors.community.contribution,
  );
  ctx.y += 3;

  // ── Resource allocation recommendations ───────────────────────────────
  sectionTitle(ctx, "คำแนะนำการจัดสรรทรัพยากร");
  // Shelters card.
  ensureSpace(ctx, 14);
  doc.setFillColor(...COLOR.shelterBg);
  doc.roundedRect(MARGIN_X, ctx.y - 4, CONTENT_WIDTH, 12, 2, 2, "F");
  doc.setFont("sarabun", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR.muted);
  doc.text("จำนวนศูนย์หลบร้อนที่ควรตั้ง", MARGIN_X + 4, ctx.y + 3);
  doc.setFont("sarabun", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLOR.accent);
  doc.text(
    `${data.recommendedShelters} จุด`,
    MARGIN_X + CONTENT_WIDTH - 4,
    ctx.y + 3,
    { align: "right" },
  );
  ctx.y += 14;
  // Green area card.
  ensureSpace(ctx, 14);
  doc.setFillColor(...COLOR.greenBg);
  doc.roundedRect(MARGIN_X, ctx.y - 4, CONTENT_WIDTH, 12, 2, 2, "F");
  doc.setFont("sarabun", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR.muted);
  doc.text("พื้นที่ที่ควรเพิ่มต้นไม้", MARGIN_X + 4, ctx.y + 3);
  doc.setFont("sarabun", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLOR.low);
  doc.text(
    `${data.recommendedGreenArea}%`,
    MARGIN_X + CONTENT_WIDTH - 4,
    ctx.y + 3,
    {
      align: "right",
    },
  );
  ctx.y += 14;

  // ── Nearby wildfire points (optional) ──────────────────────────────────
  if (data.wildfirePoints && data.wildfirePoints.length > 0) {
    sectionTitle(ctx, "จุดไฟป่าใกล้เคียง");
    // Table header.
    ensureSpace(ctx, 8);
    doc.setFont("sarabun", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR.muted);
    doc.text("พิกัด", MARGIN_X, ctx.y);
    doc.text("ระยะทาง", MARGIN_X + 90, ctx.y, { align: "left" });
    doc.text("ความรุนแรง", MARGIN_X + CONTENT_WIDTH, ctx.y, { align: "right" });
    ctx.y += 4;
    doc.setDrawColor(...COLOR.rule);
    doc.setLineWidth(0.2);
    doc.line(MARGIN_X, ctx.y, MARGIN_X + CONTENT_WIDTH, ctx.y);
    ctx.y += 5;
    for (const point of data.wildfirePoints) {
      ensureSpace(ctx, 6);
      doc.setFont("sarabun", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...COLOR.ink);
      doc.text(
        `${point.lat.toFixed(4)}°, ${point.lng.toFixed(4)}°`,
        MARGIN_X,
        ctx.y,
      );
      doc.text(`${point.distanceKm.toFixed(1)} กม.`, MARGIN_X + 90, ctx.y);
      doc.setTextColor(...COLOR.critical);
      doc.text(point.intensityLabel, MARGIN_X + CONTENT_WIDTH, ctx.y, {
        align: "right",
      });
      ctx.y += 5.5;
    }
    ctx.y += 3;
  }

  // ── Temperature measurements (optional) ───────────────────────────────
  if (data.temperatureMeasurements && data.temperatureMeasurements.length > 0) {
    sectionTitle(ctx, "การวัดอุณหภูมิ");
    ensureSpace(ctx, 8);
    doc.setFont("sarabun", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...COLOR.muted);
    doc.text("แหล่งวัด", MARGIN_X, ctx.y);
    doc.text("อุณหภูมิ", MARGIN_X + 100, ctx.y, { align: "left" });
    doc.text("เวลาที่วัด", MARGIN_X + CONTENT_WIDTH, ctx.y, { align: "right" });
    ctx.y += 4;
    doc.setDrawColor(...COLOR.rule);
    doc.setLineWidth(0.2);
    doc.line(MARGIN_X, ctx.y, MARGIN_X + CONTENT_WIDTH, ctx.y);
    ctx.y += 5;
    for (const m of data.temperatureMeasurements) {
      ensureSpace(ctx, 6);
      doc.setFont("sarabun", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...COLOR.ink);
      doc.text(m.label, MARGIN_X, ctx.y);
      doc.setTextColor(...COLOR.high);
      doc.text(`${m.valueC.toFixed(1)} °C`, MARGIN_X + 100, ctx.y);
      doc.setTextColor(...COLOR.muted);
      doc.text(m.timestamp, MARGIN_X + CONTENT_WIDTH, ctx.y, {
        align: "right",
      });
      ctx.y += 5.5;
    }
    ctx.y += 3;
  }

  // ── Summary footer ────────────────────────────────────────────────────
  ensureSpace(ctx, 16);
  ctx.y += 4;
  doc.setDrawColor(...COLOR.rule);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_X, ctx.y, MARGIN_X + CONTENT_WIDTH, ctx.y);
  ctx.y += 6;
  doc.setFont("sarabun", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLOR.ink);
  doc.text("สรุปรายงาน", MARGIN_X, ctx.y);
  ctx.y += 5;
  doc.setFont("sarabun", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...COLOR.muted);
  const summary = `จากการวิเคราะห์ พื้นที่ที่พิกัด ${data.coordinates.lat.toFixed(4)}°, ${data.coordinates.lng.toFixed(4)}° มีคะแนนความเสี่ยงจากความร้อน ${data.riskScore}/100 ระดับ "${data.riskLevel}" และอุณหภูมิที่รับรู้ ${data.apparentTemp.toFixed(1)} °C คำแนะนำคือควรตั้งศูนย์หลบร้อน ${data.recommendedShelters} จุด และเพิ่มพื้นที่สีเขียว ${data.recommendedGreenArea}% เพื่อบรรเทาผลกระทบจากความร้อนในพื้นที่`;
  const wrapped = doc.splitTextToSize(summary, CONTENT_WIDTH);
  doc.text(wrapped, MARGIN_X, ctx.y);
  ctx.y += wrapped.length * 4.5 + 4;

  // Footer line on every page.
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("sarabun", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLOR.muted);
    doc.text(
      "รายงานการวิเคราะห์ความเสี่ยงจากความร้อน — TerraFrame",
      MARGIN_X,
      PAGE_HEIGHT - 8,
    );
    doc.text(
      `หน้า ${i} / ${pageCount}`,
      MARGIN_X + CONTENT_WIDTH,
      PAGE_HEIGHT - 8,
      {
        align: "right",
      },
    );
  }

  return doc;
}

/**
 * Generate the PDF and trigger a browser download with a Thai filename.
 */
export async function downloadHeatRiskPdf(
  data: HeatRiskReportData,
): Promise<void> {
  const doc = await generateHeatRiskPdf(data);
  const ts = (data.generatedAt ?? new Date())
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  doc.save(`รายงานความเสี่ยงจากความร้อน_${ts}.pdf`);
}

/**
 * Generate the PDF and open it in a new tab so the user can use the browser's
 * print dialog. Falls back to opening the blob URL directly.
 */
export async function printHeatRiskPdf(
  data: HeatRiskReportData,
): Promise<void> {
  const doc = await generateHeatRiskPdf(data);
  const blobUrl = doc.output("bloburl");
  // Open in a new window and let the browser's print dialog handle it.
  const win = window.open(blobUrl, "_blank");
  if (win) {
    // Give the new window a moment to load before triggering print.
    win.addEventListener("load", () => {
      try {
        win.focus();
        win.print();
      } catch {
        // Some browsers block print on cross-origin blob windows; the user
        // can still use Ctrl/Cmd+P from the opened PDF tab.
      }
    });
  }
}
