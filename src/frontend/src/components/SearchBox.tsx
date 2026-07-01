import { Loader2, MapPin, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GeocodePlace } from "../backend.d";
import { useGeocodeSearch } from "../hooks/useQueries";

export interface SearchBoxProps {
  /** Called when the user picks a result — parent flies the globe + opens pin dialog. */
  onSelect: (place: GeocodePlace) => void;
}

// Try to parse a "lat,lng" coordinate string. Returns null if not a valid
// coordinate pair. Accepts optional degree symbols and N/S/E/W suffixes.
function parseLatLng(input: string): { lat: number; lng: number } | null {
  const cleaned = input.trim().replace(/[°]/g, "");
  // Match two signed decimals, optionally followed by N/S/E/W
  const m = cleaned.match(
    /^(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*([NSEW]?)$/i,
  );
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function SearchBox({ onSelect }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const geocode = useGeocodeSearch();

  // Close dropdown on outside click.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const results = geocode.data ?? [];

  // Sorted by relevance-ish heuristic: exact coordinate matches first, then
  // results with a country, then by name length (shorter = more prominent).
  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      if (!!b.country !== !!a.country) return b.country ? 1 : -1;
      return a.name.length - b.name.length;
    });
  }, [results]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    // Direct lat,lng input — skip the backend and fly straight there.
    const coord = parseLatLng(trimmed);
    if (coord) {
      onSelect({
        name: `${coord.lat.toFixed(4)}°, ${coord.lng.toFixed(4)}°`,
        lat: coord.lat,
        lng: coord.lng,
        country: "",
      });
      setOpen(false);
      return;
    }

    geocode.mutate(trimmed, {
      onSuccess: (data) => {
        if (data.length > 0) setOpen(true);
      },
    });
    setOpen(true);
  };

  const handlePick = (place: GeocodePlace) => {
    onSelect(place);
    setQuery(place.name);
    setOpen(false);
  };

  const clear = () => {
    setQuery("");
    setOpen(false);
    geocode.reset();
  };

  const showDropdown = open && (geocode.isPending || results.length > 0);

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleSubmit} className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "#AAB4C3" }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="ค้นหาสถานที่ หรือ ละติจูด,ลองจิจูด"
          className="w-full h-10 pl-9 pr-9 rounded-lg text-sm outline-none transition-colors"
          style={{
            background: "rgba(20, 25, 34, 0.9)",
            border: "1px solid rgba(43, 52, 67, 0.8)",
            color: "#E8EDF6",
          }}
          data-ocid="search.input"
          aria-label="ค้นหาสถานที่"
        />
        {query && !geocode.isPending && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "#AAB4C3" }}
            aria-label="ล้างการค้นหา"
            data-ocid="search.clear_button"
          >
            <X size={15} />
          </button>
        )}
        {geocode.isPending && (
          <Loader2
            size={15}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
            style={{ color: "#67D5FF" }}
          />
        )}
      </form>

      {showDropdown && (
        <div
          className="absolute top-full mt-1.5 w-full rounded-lg overflow-hidden z-50"
          style={{
            background: "rgba(20, 25, 34, 0.98)",
            border: "1px solid rgba(43, 52, 67, 0.8)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
          data-ocid="search.dropdown_menu"
        >
          <div
            className="px-3 py-2 text-[10px] font-semibold tracking-widest"
            style={{
              color: "#AAB4C3",
              borderBottom: "1px solid rgba(43, 52, 67, 0.6)",
            }}
          >
            ผลการค้นหา
          </div>
          <div className="max-h-64 overflow-y-auto">
            {sortedResults.map((place, i) => (
              <button
                type="button"
                key={`${place.lat},${place.lng},${i}`}
                onClick={() => handlePick(place)}
                className="w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors"
                style={{ borderBottom: "1px solid rgba(43, 52, 67, 0.3)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(58, 135, 255, 0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
                data-ocid={`search.item.${i + 1}`}
              >
                <MapPin
                  size={14}
                  style={{ color: "#67D5FF", flexShrink: 0, marginTop: 2 }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-[13px] truncate"
                    style={{ color: "#E8EDF6" }}
                  >
                    {place.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: "#AAB4C3" }}
                    >
                      {place.lat.toFixed(4)}°, {place.lng.toFixed(4)}°
                    </span>
                    {place.country && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          background: "rgba(58, 135, 255, 0.15)",
                          color: "#67D5FF",
                        }}
                      >
                        {place.country}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div
            className="px-3 py-2 text-[10px] text-center"
            style={{
              color: "#AAB4C3",
              borderTop: "1px solid rgba(43, 52, 67, 0.6)",
            }}
          >
            คลิกผลการค้นหาเพื่อปักหมุดที่นี่
          </div>
        </div>
      )}

      {open && !geocode.isPending && results.length === 0 && (
        <div
          className="absolute top-full mt-1.5 w-full rounded-lg px-3 py-3 text-center text-[11px] z-50"
          style={{
            background: "rgba(20, 25, 34, 0.98)",
            border: "1px solid rgba(43, 52, 67, 0.8)",
            color: "#AAB4C3",
          }}
          data-ocid="search.empty_state"
        >
          ไม่พบผลการค้นหา
        </div>
      )}
    </div>
  );
}
