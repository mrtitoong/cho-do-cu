"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { List, Loader2, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DEFAULT_CITY_NAME, DEFAULT_MAP_CENTER } from "@/config/map";
import { clearFilters, countActiveFilters, withCategory } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { CategoryChips } from "./category-chips";
import { FilterPanel } from "./filter-panel";
import { ListingResults } from "./listing-results";
import { useSearchListings } from "./use-search-listings";
import { useSearchState } from "./use-search-state";

const SearchMap = dynamic(() => import("./search-map"), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-muted text-sm text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" /> Đang tải bản đồ...
    </div>
  ),
});

type Props = { categories: { id: number; slug: string; parent_id: number | null }[] };

export function SearchPage({ categories }: Props) {
  const { categoryIdBySlug, mainSlugById } = useMemo(
    () => ({
      categoryIdBySlug: Object.fromEntries(categories.map((c) => [c.slug, c.id])),
      mainSlugById: Object.fromEntries(categories.filter((c) => c.parent_id === null).map((c) => [c.id, c.slug])),
    }),
    [categories],
  );

  const { filters, center, setFilters, setCenter } = useSearchState();
  const result = useSearchListings(filters, center, categoryIdBySlug);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false); // chỉ dùng trên điện thoại
  const activeCount = countActiveFilters(filters);

  // Lần đầu vào trang (URL chưa có vị trí): xin vị trí người dùng, bị từ chối thì dùng tâm mặc định
  const setCenterRef = useRef(setCenter);
  useEffect(() => {
    setCenterRef.current = setCenter;
  });
  const needsLocation = center === null;
  useEffect(() => {
    if (!needsLocation) return;
    let cancelled = false;
    const fallback = () => {
      if (cancelled) return;
      toast.info(`Không lấy được vị trí của bạn, đang hiển thị khu vực trung tâm ${DEFAULT_CITY_NAME}.`);
      setCenterRef.current(DEFAULT_MAP_CENTER, "replace");
    };
    if (!("geolocation" in navigator)) {
      fallback();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!cancelled) setCenterRef.current({ lat: coords.latitude, lng: coords.longitude }, "replace");
      },
      fallback,
      { timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
    return () => {
      cancelled = true;
    };
  }, [needsLocation]);

  const summary =
    result.status === "ready"
      ? `${result.items.length}${result.hasMore ? "+" : ""} tin trong bán kính ${filters.radius} km`
      : result.status === "loading"
        ? "Đang tìm tin..."
        : "Có lỗi khi tải tin";

  // Kéo tay nắm bảng danh sách: vuốt lên mở, vuốt xuống đóng, chạm để chuyển
  const dragStartY = useRef<number | null>(null);
  const handleProps = {
    onPointerDown: (e: React.PointerEvent) => {
      dragStartY.current = e.clientY;
    },
    onPointerUp: (e: React.PointerEvent) => {
      if (dragStartY.current === null) return;
      const dy = e.clientY - dragStartY.current;
      dragStartY.current = null;
      if (Math.abs(dy) < 10) setListOpen((o) => !o);
      else setListOpen(dy < 0);
    },
  };

  return (
    <div className="flex h-[calc(100dvh-8rem-1px-env(safe-area-inset-bottom))] flex-col md:h-[calc(100dvh-4rem-1px)]">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <div className="min-w-0 flex-1">
          <CategoryChips value={filters.main} onChange={(main) => setFilters(withCategory(filters, main))} />
        </div>
        <Button variant="outline" className="relative h-10 shrink-0 rounded-full px-3" onClick={() => setFilterOpen(true)}>
          <SlidersHorizontal />
          <span className="hidden sm:inline">Bộ lọc</span>
          {activeCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              {activeCount}
            </span>
          )}
        </Button>
      </div>

      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <section
          aria-label="Danh sách tin"
          className={cn(
            "absolute inset-x-0 bottom-0 z-10 flex flex-col bg-background shadow-[0_-4px_16px_rgb(0_0_0/0.12)] transition-[height] duration-300",
            listOpen ? "h-full" : "h-20 rounded-t-2xl",
            "md:static md:h-auto md:w-2/5 md:rounded-none md:border-r md:shadow-none",
          )}
        >
          <div
            {...handleProps}
            className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center md:hidden"
            aria-hidden="true"
          >
            <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="flex min-h-11 shrink-0 items-center justify-between gap-2 px-4 pb-2 md:pt-2">
            <button
              type="button"
              className="truncate text-left text-sm font-medium md:pointer-events-none"
              onClick={() => setListOpen((o) => !o)}
            >
              {summary}
            </button>
            {activeCount > 0 && (
              <Button variant="ghost" className="h-11 shrink-0 text-primary" onClick={() => setFilters(clearFilters(filters))}>
                Xóa lọc ({activeCount})
              </Button>
            )}
          </div>
          <div className={cn("min-h-0 flex-1 overflow-y-auto px-2 pb-20 md:pb-2", !listOpen && "max-md:invisible")}>
            <ListingResults
              result={result}
              mainSlugById={mainSlugById}
              radiusKm={filters.radius}
              onHover={setHoveredId}
              onWidenRadius={(radius) => setFilters({ ...filters, radius })}
            />
          </div>
        </section>

        <div className="min-w-0 flex-1">
          <SearchMap
            center={center ?? DEFAULT_MAP_CENTER}
            radiusKm={filters.radius}
            items={result.items}
            mainSlugById={mainSlugById}
            hoveredId={hoveredId}
            onSearchArea={(c) => setCenter(c)}
          />
        </div>

        <Button
          className={cn(
            "absolute left-1/2 z-20 h-11 -translate-x-1/2 rounded-full px-5 shadow-lg md:hidden",
            listOpen ? "bottom-4" : "bottom-24",
          )}
          onClick={() => setListOpen((o) => !o)}
        >
          {listOpen ? (
            <>
              <MapIcon /> Bản đồ
            </>
          ) : (
            <>
              <List /> Danh sách
            </>
          )}
        </Button>
      </div>

      <FilterPanel open={filterOpen} onOpenChange={setFilterOpen} filters={filters} onApply={setFilters} />
    </div>
  );
}
