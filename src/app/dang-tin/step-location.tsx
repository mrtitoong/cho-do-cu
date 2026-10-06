"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Info, Loader2, LocateFixed, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, PICKED_MAP_ZOOM } from "@/config/map";
import { reverseGeocode, searchAddress, type Area, type SearchResult } from "@/lib/geocode";
import type { ListingLocation } from "@/lib/listing-location";

const LocationMap = dynamic(() => import("./location-map"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-muted text-sm text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" /> Đang tải bản đồ...
    </div>
  ),
});

type Props = {
  value: ListingLocation | null;
  onChange: (value: ListingLocation | null) => void;
  error?: string;
};

type Focus = { lat: number; lng: number; zoom: number };

const SEARCH_DELAY_MS = 500;
const round = (n: number) => Math.round(n * 1e6) / 1e6; // ~10 cm, đủ chính xác

function geolocationError(err: GeolocationPositionError) {
  if (err.code === err.PERMISSION_DENIED)
    return "Bạn đã chặn quyền truy cập vị trí. Hãy bật lại trong cài đặt trình duyệt, hoặc tìm địa chỉ / bấm lên bản đồ.";
  if (err.code === err.TIMEOUT) return "Lấy vị trí quá lâu, vui lòng thử lại.";
  return "Không xác định được vị trí hiện tại. Hãy tìm địa chỉ hoặc bấm lên bản đồ.";
}

export function StepLocation({ value, onChange, error }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const reverseAbort = useRef<AbortController | null>(null);

  // Tìm địa chỉ: chờ 500 ms sau khi ngừng gõ, hủy yêu cầu cũ khi gõ tiếp
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchAddress(q, controller.signal));
      } catch (e) {
        if (!controller.signal.aborted) {
          console.error("Tìm địa chỉ:", e);
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, SEARCH_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => () => reverseAbort.current?.abort(), []);

  function flyTo(lat: number, lng: number) {
    setFocus({ lat, lng, zoom: PICKED_MAP_ZOOM });
  }

  /** Đặt ghim tại toạ độ rồi tự điền khu vực bằng reverse geocoding. */
  async function pick(point: { lat: number; lng: number }, area?: Area) {
    const lat = round(point.lat);
    const lng = round(point.lng);
    reverseAbort.current?.abort();

    if (area) {
      onChange({ lat, lng, ...area });
      return;
    }

    onChange({ lat, lng, addressText: null, province: null, district: null });
    const controller = new AbortController();
    reverseAbort.current = controller;
    setResolving(true);
    try {
      onChange({ lat, lng, ...(await reverseGeocode(lat, lng, controller.signal)) });
    } catch (e) {
      if (!controller.signal.aborted) console.error("Reverse geocoding:", e);
    } finally {
      if (!controller.signal.aborted) setResolving(false);
    }
  }

  function chooseResult(r: SearchResult) {
    setResults(null);
    setQuery(r.label);
    flyTo(r.lat, r.lng);
    void pick(r, r);
  }

  function locateMe() {
    if (!("geolocation" in navigator)) {
      setNotice("Trình duyệt không hỗ trợ định vị. Hãy tìm địa chỉ hoặc bấm lên bản đồ.");
      return;
    }
    setNotice(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        flyTo(coords.latitude, coords.longitude);
        void pick({ lat: coords.latitude, lng: coords.longitude });
      },
      (err) => {
        setLocating(false);
        setNotice(geolocationError(err));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }

  const showResults = results !== null && query.trim().length >= 3;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold">
          Vị trí <span className="text-destructive">*</span>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tìm địa chỉ, dùng vị trí hiện tại hoặc bấm lên bản đồ để đặt ghim. Kéo ghim để chỉnh cho đúng.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative z-10 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            className="h-11 pl-9"
            placeholder="Tìm địa chỉ, VD: 12 Nguyễn Huệ, Quận 1"
            aria-label="Tìm địa chỉ"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length < 3) setResults(null);
            }}
          />
          {searching && (
            <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
          {showResults && (
            <ul className="absolute inset-x-0 top-full mt-1 max-h-72 overflow-auto rounded-lg border bg-popover shadow-lg">
              {results.length === 0 && !searching && (
                <li className="p-3 text-sm text-muted-foreground">Không tìm thấy địa chỉ phù hợp.</li>
              )}
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => chooseResult(r)}
                    className="flex min-h-11 w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    {r.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button type="button" variant="outline" className="h-11" onClick={locateMe} disabled={locating}>
          {locating ? <Loader2 className="animate-spin" /> : <LocateFixed />}
          Dùng vị trí hiện tại
        </Button>
      </div>

      {notice && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">{notice}</p>}

      {/* isolate: giữ z-index của Leaflet bên trong, không đè lên thanh điều hướng */}
      <div className="isolate h-72 overflow-hidden rounded-xl border sm:h-96">
        <LocationMap
          center={value ?? DEFAULT_MAP_CENTER}
          zoom={value ? PICKED_MAP_ZOOM : DEFAULT_MAP_ZOOM}
          focus={focus}
          marker={value}
          onPick={(p) => void pick(p)}
        />
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-sm">
        <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        {resolving ? (
          <span className="text-muted-foreground">Đang xác định khu vực...</span>
        ) : value ? (
          <span>
            <span className="text-muted-foreground">Khu vực: </span>
            {value.addressText ?? "Chưa xác định được tên khu vực (vẫn đăng được)"}
          </span>
        ) : (
          <span className="text-muted-foreground">Chưa chọn vị trí.</span>
        )}
      </div>

      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        Vị trí chính xác sẽ được ẩn, người xem chỉ thấy khu vực gần đúng.
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
