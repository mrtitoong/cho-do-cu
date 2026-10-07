"use client";

import { useEffect, useRef } from "react";
import { Loader2, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MainCategory } from "@/lib/category-tree";
import { RADIUS_OPTIONS } from "@/lib/search-params";
import { ListingCard, ListingCardSkeleton } from "./listing-card";
import type { useSearchListings } from "./use-search-listings";

type Props = {
  result: ReturnType<typeof useSearchListings>;
  mainById: Record<number, MainCategory>;
  radiusKm: number;
  onHover: (id: string | null) => void;
  onWidenRadius: (radiusKm: number) => void;
};

export function ListingResults({ result, mainById, radiusKm, onHover, onWidenRadius }: Props) {
  const sentinel = useRef<HTMLDivElement>(null);
  const { items, status, hasMore, loadingMore, loadMoreError, loadMore, retry } = result;

  // Cuộn tới cuối danh sách thì tải thêm
  useEffect(() => {
    const el = sentinel.current;
    if (!el || status !== "ready" || !hasMore || loadMoreError) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadMore();
    }, { rootMargin: "300px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [status, hasMore, loadMoreError, loadMore]);

  if (status === "loading") {
    return (
      <div aria-busy="true" aria-label="Đang tải tin">
        {Array.from({ length: 6 }, (_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">Không tải được danh sách tin. Vui lòng thử lại.</p>
        <Button variant="outline" className="h-11" onClick={() => void retry()}>
          Thử lại
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    const wider = RADIUS_OPTIONS.find((r) => r > radiusKm);
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <SearchX className="size-10 text-muted-foreground" />
        <p className="font-medium">Không tìm thấy tin nào, thử nới rộng bán kính</p>
        {wider && (
          <Button variant="outline" className="h-11" onClick={() => onWidenRadius(wider)}>
            Tìm trong bán kính {wider} km
          </Button>
        )}
      </div>
    );
  }

  return (
    <div>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <ListingCard item={item} main={mainById[item.parent_category_id]} onHover={onHover} />
          </li>
        ))}
      </ul>
      <div ref={sentinel} className="flex min-h-12 items-center justify-center py-3 text-sm text-muted-foreground">
        {loadingMore && <Loader2 className="size-5 animate-spin" aria-label="Đang tải thêm" />}
        {loadMoreError && (
          <Button variant="outline" className="h-11" onClick={() => void loadMore()}>
            Tải thêm tin
          </Button>
        )}
        {!hasMore && items.length > 0 && <span>Đã hiện hết {items.length} tin</span>}
      </div>
    </div>
  );
}
