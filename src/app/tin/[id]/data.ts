import { cache } from "react";
import { findSubCategory, getCategoryTree } from "@/lib/categories";
import type { SearchResultItem } from "@/components/search/use-search-listings";
import { parseGeographyPoint } from "@/lib/listing-location";
import { listingPriceText } from "@/lib/listing-schema";
import { createClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIMILAR_COUNT = 6;
const SIMILAR_RADIUS_KM = 100;

/**
 * Tin + ảnh + người bán. Chỉ chọn cột công khai: KHÔNG chọn location (vị trí thật),
 * address_text, hay profiles.phone. Bọc cache() để generateMetadata và page chỉ truy vấn 1 lần.
 */
export const getListing = cache(async (id: string) => {
  if (!UUID_RE.test(id)) return null;
  const supabase = await createClient();
  const [{ data, error }, categories] = await Promise.all([
    supabase
      .from("listings")
      .select(
        `id, seller_id, category_id, title, description, price, price_unit, attributes, status,
         public_location, province, district, created_at,
         category:categories(slug),
         images:listing_images(path, sort_order),
         seller:profiles(id, full_name, avatar_url, created_at)`,
      )
      .eq("id", id)
      .maybeSingle(),
    getCategoryTree(),
  ]);
  if (error) console.error("getListing:", error);
  if (!data) return null;

  const sub = findSubCategory(categories, data.category?.slug);
  const main = sub ? categories.find((m) => m.id === sub.parentId) : undefined;
  const attributes = (data.attributes ?? {}) as Record<string, unknown>;
  const priceText = listingPriceText(sub, { ...data, attributes });

  return {
    ...data,
    sub,
    main,
    attributes,
    priceText,
    images: [...data.images].sort((a, b) => a.sort_order - b.sort_order),
    area: [data.district, data.province].filter(Boolean).join(", "),
    point: parseGeographyPoint(data.public_location),
  };
});

export type ListingDetail = NonNullable<Awaited<ReturnType<typeof getListing>>>;

/** Số tin đang bán của người bán. */
export async function countActiveListings(sellerId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", sellerId)
    .eq("status", "active");
  return count ?? 0;
}

/** 6 tin cùng danh mục con, gần tin này nhất (theo vị trí đã làm mờ). */
export async function getSimilarListings(listing: ListingDetail): Promise<SearchResultItem[]> {
  if (!listing.point) return [];
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_listings", {
    p_lat: listing.point.lat,
    p_lng: listing.point.lng,
    p_radius_km: SIMILAR_RADIUS_KM,
    p_category_ids: [listing.category_id],
    p_sort: "nearest",
    p_limit: SIMILAR_COUNT + 1,
  });
  if (error) {
    console.error("getSimilarListings:", error);
    return [];
  }
  return ((data ?? []) as SearchResultItem[]).filter((i) => i.id !== listing.id).slice(0, SIMILAR_COUNT);
}

/** "0912 xxx xxx" nếu người bán đã khai số, null nếu chỉ nhận chat, undefined nếu không kiểm tra được. */
export async function getSellerPhoneHint(listingId: string): Promise<string | null | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_seller_phone_hint", { p_listing_id: listingId });
  if (error) {
    console.error("getSellerPhoneHint:", error);
    return undefined;
  }
  return data ?? null;
}
