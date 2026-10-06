"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { buildSearchParams, parseSearchParams, type LatLng, type SearchFilters } from "@/lib/search-params";

/** Đọc/ghi bộ lọc trên URL. Đổi bộ lọc dùng push (Back quay lại được), lần đầu đặt vị trí dùng replace. */
export function useSearchState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  const { filters, center } = useMemo(
    () => parseSearchParams(new URLSearchParams(queryString)),
    [queryString],
  );

  const navigate = useCallback(
    (next: { filters?: SearchFilters; center?: LatLng | null }, mode: "push" | "replace" = "push") => {
      const qs = buildSearchParams(next.filters ?? filters, next.center === undefined ? center : next.center).toString();
      if (qs === queryString) return;
      const url = qs ? `${pathname}?${qs}` : pathname;
      if (mode === "replace") router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [router, pathname, queryString, filters, center],
  );

  const setFilters = useCallback((next: SearchFilters) => navigate({ filters: next }), [navigate]);
  const setCenter = useCallback(
    (next: LatLng, mode: "push" | "replace" = "push") => navigate({ center: next }, mode),
    [navigate],
  );

  return { filters, center, setFilters, setCenter };
}
