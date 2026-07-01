import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useFetchGovData } from "../hooks/useQueries";

// Maps the backend `source` field to a Thai status label + tone. The backend
// returns "mock" / "fallback" when no real government endpoint is wired, or the
// real source name (e.g. "กรมอุตุนิยมวิทยา") when the API is connected. We treat
// any non-mock/fallback value as live data.
interface SourceStatus {
  label: string;
  dotClass: string;
  textClass: string;
  pillClass: string;
}

function resolveSourceStatus(source: string): SourceStatus {
  const isMock = source === "mock" || source === "fallback";
  if (isMock) {
    return {
      label: "ข้อมูลจำลอง",
      dotClass: "bg-amber-400",
      textClass: "text-amber-300",
      pillClass: "bg-amber-400/10 border-amber-400/30",
    };
  }
  return {
    label: "ข้อมูลสด",
    dotClass: "bg-emerald-400",
    textClass: "text-emerald-300",
    pillClass: "bg-emerald-400/10 border-emerald-400/30",
  };
}

// Formats a nanosecond backend timestamp (Time.Time) into a compact HH:mm:ss
// Thai-locale string. Returns "—" when fetchedAt is 0n (fallback envelope that
// was never actually fetched from a backend).
function formatFetchedAt(fetchedAt: bigint): string {
  if (fetchedAt === 0n) return "—";
  const ms = Number(fetchedAt / 1_000_000n);
  if (Number.isNaN(ms)) return "—";
  return new Date(ms).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function GovDataStatus() {
  const queryClient = useQueryClient();
  const { data, isFetching, isError } = useFetchGovData();

  const source = data?.source ?? "mock";
  const status = resolveSourceStatus(source);
  const fetchedAt = data?.fetchedAt ?? 0n;
  const pointCount = data?.points.length ?? 0;
  const isRefreshing = isFetching;

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["govData"] });
    toast.success("กำลังรีเฟรชข้อมูลรัฐบาล…");
  }

  return (
    <div
      className="glass-panel flex items-center gap-2 px-3 py-2"
      data-ocid="gov_data_status.panel"
    >
      {/* Status pill — dot + label, tone follows source */}
      <div
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${status.pillClass}`}
        data-ocid="gov_data_status.source_pill"
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${status.dotClass} ${isRefreshing ? "animate-pulse" : ""}`}
          aria-hidden="true"
        />
        <span
          className={`text-[11px] font-semibold tracking-wide ${status.textClass}`}
        >
          {status.label}
        </span>
      </div>

      {/* Source name + last fetched timestamp */}
      <div className="flex flex-col leading-tight">
        <span
          className="text-[10px] font-medium text-foreground/80"
          title={source}
        >
          {source === "mock" || source === "fallback"
            ? "แหล่งข้อมูลตัวอย่าง"
            : source}
        </span>
        <span className="text-[9px] text-muted-foreground">
          {pointCount} จุด · {formatFetchedAt(fetchedAt)}
        </span>
      </div>

      {/* Refresh icon button */}
      <button
        type="button"
        onClick={handleRefresh}
        aria-label="รีเฟรชข้อมูล"
        title="รีเฟรชข้อมูล"
        disabled={isRefreshing}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        data-ocid="gov_data_status.refresh_button"
      >
        <RefreshCw
          size={13}
          className={isRefreshing ? "animate-spin" : ""}
          aria-hidden="true"
        />
      </button>

      {/* Error indicator — only surfaces when the query itself failed, not
          when the backend gracefully returned a fallback envelope. */}
      {isError && (
        <span
          className="text-[10px] font-medium text-destructive"
          data-ocid="gov_data_status.error_state"
        >
          โหลดไม่สำเร็จ
        </span>
      )}
    </div>
  );
}
