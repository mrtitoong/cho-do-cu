"use client";

import { useEffect, useState } from "react";
import { ListingCard } from "@/components/search/listing-card";
import type { SearchResultItem } from "@/components/search/use-search-listings";
import { HOME_LATEST_LIMIT, HOME_NEARBY_RADIUS_KM } from "@/config/home";
import type { MainCategory } from "@/lib/category-tree";
import { createClient } from "@/lib/supabase/client";

type Props = {
  /** Tin mới nhất toàn nền tảng (server đã tải sẵn) */
  initial: SearchResultItem[];
  /** id danh mục chính → màu, icon (cho ảnh thay thế khi tin không có ảnh) */
  mains: Record<number, Pick<MainCategory, "color" | "icon">>;
};

/**
 * Lưới "Tin đăng mới". Nếu người xem ĐÃ cho phép vị trí từ trước thì ưu tiên tin mới gần họ,
 * thiếu thì bù bằng tin mới toàn nền tảng. Không tự bật hộp thoại xin quyền ở trang chủ.
 */
export function LatestListings({ initial, mains }: Props) {
  const [items, setItems] = useState(initial);

  useEffect(() => {
    let cancelled = false;
    if (!("geolocation" in navigator) || !navigator.permissions) return;

    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (status.state !== "granted" || cancelled) return;
        navigator.geolocation.getCurrentPosition(
          async ({ coords }) => {
            const { data, error } = await createClient().rpc("search_listings", {
              p_lat: coords.latitude,
              p_lng: coords.longitude,
              p_radius_km: HOME_NEARBY_RADIUS_KM,
              p_sort: "newest",
              p_limit: HOME_LATEST_LIMIT,
            });
            if (cancelled || error || !data?.length) return;
            const nearby = data as SearchResultItem[];
            const seen = new Set(nearby.map((i) => i.id));
            setItems([...nearby, ...initial.filter((i) => !seen.has(i.id))].slice(0, HOME_LATEST_LIMIT));
          },
          () => {}, // không lấy được vị trí → giữ danh sách chung
          { maximumAge: 10 * 60 * 1000, timeout: 10_000 },
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [initial]);

  return (
    <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <li key={item.id}>
          <ListingCard item={item} main={mains[item.parent_category_id]} />
        </li>
      ))}
    </ul>
  );
}
