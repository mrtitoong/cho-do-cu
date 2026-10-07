"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CategoryTree } from "@/lib/category-tree";
import { toSearchRpcArgs, type LatLng, type SearchFilters } from "@/lib/search-params";
import { createClient } from "@/lib/supabase/client";

export const PAGE_SIZE = 30;

/** Một dòng kết quả của hàm search_listings (toạ độ là vị trí đã làm mờ). */
export type SearchResultItem = {
  id: string;
  title: string;
  price: number | null;
  price_unit: string;
  category_id: number;
  parent_category_id: number;
  province: string | null;
  district: string | null;
  created_at: string;
  lat: number;
  lng: number;
  distance_m: number | null;
  cover_image_path: string | null;
};

type State = {
  items: SearchResultItem[];
  status: "loading" | "ready" | "error";
  loadingMore: boolean;
  loadMoreError: boolean;
  hasMore: boolean;
};

const INITIAL: State = { items: [], status: "loading", loadingMore: false, loadMoreError: false, hasMore: false };

/** Gọi RPC search_listings, phân trang 30 tin; đổi bộ lọc thì tải lại từ đầu. */
export function useSearchListings(
  filters: SearchFilters,
  center: LatLng | null,
  categories: CategoryTree,
) {
  const supabase = useMemo(() => createClient(), []);
  const [state, setState] = useState<State>(INITIAL);
  // Mỗi lần đổi bộ lọc tăng "thế hệ" để bỏ qua kết quả trả về muộn của lần tìm cũ
  const generation = useRef(0);

  const fetchPage = useCallback(
    async (offset: number) => {
      if (!center) return [];
      const args = toSearchRpcArgs(filters, center, categories, { limit: PAGE_SIZE, offset });
      const { data, error } = await supabase.rpc("search_listings", args);
      if (error) throw error;
      return (data ?? []) as SearchResultItem[];
    },
    [supabase, filters, center, categories],
  );

  const load = useCallback(async () => {
    const gen = ++generation.current;
    setState(INITIAL);
    if (!center) return; // chờ xác định vị trí
    try {
      const items = await fetchPage(0);
      if (gen === generation.current) {
        setState({ ...INITIAL, items, status: "ready", hasMore: items.length === PAGE_SIZE });
      }
    } catch (e) {
      console.error("Tìm tin:", e);
      if (gen === generation.current) setState({ ...INITIAL, status: "error" });
    }
  }, [center, fetchPage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu khi bộ lọc trên URL đổi
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (state.status !== "ready" || !state.hasMore || state.loadingMore) return;
    const gen = generation.current;
    setState((s) => ({ ...s, loadingMore: true, loadMoreError: false }));
    try {
      const more = await fetchPage(state.items.length);
      if (gen !== generation.current) return;
      setState((s) => {
        const seen = new Set(s.items.map((i) => i.id));
        return {
          ...s,
          items: [...s.items, ...more.filter((i) => !seen.has(i.id))],
          loadingMore: false,
          hasMore: more.length === PAGE_SIZE,
        };
      });
    } catch (e) {
      console.error("Tải thêm tin:", e);
      if (gen === generation.current) setState((s) => ({ ...s, loadingMore: false, loadMoreError: true }));
    }
  }, [state, fetchPage]);

  return { ...state, retry: load, loadMore };
}
