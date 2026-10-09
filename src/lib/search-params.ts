import {
  findMainCategory,
  findSubCategory,
  getFilterFields,
  type CategoryTree,
  type FieldDef,
} from "@/lib/category-tree";

/*
 * Trạng thái tìm kiếm của trang /tim-kiem, lưu toàn bộ trên URL để chia sẻ link và bấm Back vẫn đúng.
 *   q        từ khóa                     dm / dmc   danh mục chính / con (slug)
 *   gia_tu   giá tối thiểu (đ)            gia_den    giá tối đa (đ)
 *   bk       bán kính (km, mặc định 5)    sx         sắp xếp (mặc định gần nhất)
 *   lat/lng  tâm tìm kiếm
 *   a_<key>  bộ lọc riêng: "apple,samsung" (select), "30-80", "30-", "-80" (số / năm / khoảng số)
 *            hoặc chữ cần tìm (văn bản)
 */

export const RADIUS_OPTIONS = [1, 3, 5, 10, 20] as const;
export const DEFAULT_RADIUS = 5;

export const SORT_OPTIONS = [
  { value: "nearest", label: "Gần nhất" },
  { value: "newest", label: "Mới nhất" },
  { value: "price_asc", label: "Giá thấp" },
  { value: "price_desc", label: "Giá cao" },
] as const;
export type SortValue = (typeof SORT_OPTIONS)[number]["value"];
export const DEFAULT_SORT: SortValue = "nearest";

export type AttrFilter = { values: string[] } | { text: string } | { min?: number; max?: number };

const ATTR_TEXT_MAX = 50;

export type SearchFilters = {
  q: string;
  main?: string;
  sub?: string;
  minPrice?: number;
  maxPrice?: number;
  radius: number;
  sort: SortValue;
  attrs: Record<string, AttrFilter>;
};

export type LatLng = { lat: number; lng: number };

export const EMPTY_FILTERS: SearchFilters = { q: "", radius: DEFAULT_RADIUS, sort: DEFAULT_SORT, attrs: {} };

const ATTR_PREFIX = "a_";

function parseNumber(text: string | null | undefined) {
  if (!text) return undefined;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function parseAttr(field: FieldDef, raw: string): AttrFilter | undefined {
  if (field.type === "select") {
    const allowed = new Set(field.options?.map((o) => o.value));
    const values = raw.split(",").filter((v) => allowed.has(v));
    return values.length ? { values: [...new Set(values)] } : undefined;
  }
  if (field.type === "text") {
    const text = raw.trim().slice(0, ATTR_TEXT_MAX);
    return text ? { text } : undefined;
  }
  if (field.type === "number" || field.type === "year" || field.type === "range") {
    const [minText, maxText] = raw.split("-");
    const min = parseNumber(minText);
    const max = parseNumber(maxText);
    return min === undefined && max === undefined ? undefined : { min, max };
  }
  return undefined;
}

function formatAttr(filter: AttrFilter) {
  if ("values" in filter) return filter.values.join(",");
  if ("text" in filter) return filter.text.trim();
  return `${filter.min ?? ""}-${filter.max ?? ""}`;
}

export function isAttrFilterEmpty(filter: AttrFilter | undefined) {
  if (!filter) return true;
  if ("values" in filter) return filter.values.length === 0;
  if ("text" in filter) return !filter.text.trim();
  return filter.min === undefined && filter.max === undefined;
}

/** URL → bộ lọc. Giá trị sai (danh mục không tồn tại, bán kính lạ...) bị bỏ qua. */
export function parseSearchParams(
  params: URLSearchParams,
  categories: CategoryTree,
): { filters: SearchFilters; center: LatLng | null } {
  const sub = findSubCategory(categories, params.get("dmc"));
  const main = findMainCategory(categories, sub ? sub.parent : params.get("dm"));

  const radius = Number(params.get("bk"));
  const sort = params.get("sx");

  const attrs: Record<string, AttrFilter> = {};
  for (const field of getFilterFields(categories, main?.slug, sub?.slug)) {
    const raw = params.get(ATTR_PREFIX + field.key);
    const parsed = raw ? parseAttr(field, raw) : undefined;
    if (parsed) attrs[field.key] = parsed;
  }

  const lat = Number(params.get("lat"));
  const lng = Number(params.get("lng"));
  const hasCenter =
    params.has("lat") && params.has("lng") && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0);

  return {
    filters: {
      q: (params.get("q") ?? "").trim().slice(0, 100),
      main: main?.slug,
      sub: sub?.slug,
      minPrice: parseNumber(params.get("gia_tu")),
      maxPrice: parseNumber(params.get("gia_den")),
      radius: (RADIUS_OPTIONS as readonly number[]).includes(radius) ? radius : DEFAULT_RADIUS,
      sort: SORT_OPTIONS.some((o) => o.value === sort) ? (sort as SortValue) : DEFAULT_SORT,
      attrs,
    },
    center: hasCenter ? { lat, lng } : null,
  };
}

const round = (n: number) => Math.round(n * 1e4) / 1e4; // ~10 m, link ngắn gọn

/** Bộ lọc → query string (bỏ các giá trị mặc định cho link gọn). */
export function buildSearchParams(filters: SearchFilters, center: LatLng | null) {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.main) params.set("dm", filters.main);
  if (filters.sub) params.set("dmc", filters.sub);
  if (filters.minPrice !== undefined) params.set("gia_tu", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("gia_den", String(filters.maxPrice));
  if (filters.radius !== DEFAULT_RADIUS) params.set("bk", String(filters.radius));
  if (filters.sort !== DEFAULT_SORT) params.set("sx", filters.sort);
  for (const [key, filter] of Object.entries(filters.attrs)) {
    if (!isAttrFilterEmpty(filter)) params.set(ATTR_PREFIX + key, formatAttr(filter));
  }
  if (center) {
    params.set("lat", String(round(center.lat)));
    params.set("lng", String(round(center.lng)));
  }
  return params;
}

/** Số bộ lọc đang bật (không tính sắp xếp và vị trí). */
export function countActiveFilters(filters: SearchFilters) {
  return (
    Number(Boolean(filters.q.trim())) +
    Number(Boolean(filters.main)) +
    Number(filters.minPrice !== undefined || filters.maxPrice !== undefined) +
    Number(filters.radius !== DEFAULT_RADIUS) +
    Object.values(filters.attrs).filter((f) => !isAttrFilterEmpty(f)).length
  );
}

/** Giữ lại vị trí và kiểu sắp xếp, bỏ mọi bộ lọc khác. */
export function clearFilters(filters: SearchFilters): SearchFilters {
  return { ...EMPTY_FILTERS, sort: filters.sort };
}

/** Đổi danh mục thì bỏ các bộ lọc riêng không còn áp dụng. */
export function withCategory(
  categories: CategoryTree,
  filters: SearchFilters,
  main?: string,
  sub?: string,
): SearchFilters {
  const keys = new Set(getFilterFields(categories, main, sub).map((f) => f.key));
  const attrs = Object.fromEntries(Object.entries(filters.attrs).filter(([key]) => keys.has(key)));
  return { ...filters, main, sub, attrs };
}

/** Tham số gọi hàm SQL search_listings. */
export function toSearchRpcArgs(
  filters: SearchFilters,
  center: LatLng,
  categories: CategoryTree,
  page: { limit: number; offset: number },
) {
  const categoryId = filters.sub
    ? findSubCategory(categories, filters.sub)?.id
    : findMainCategory(categories, filters.main)?.id;

  const attrFilters: Record<string, unknown> = {};
  for (const [key, filter] of Object.entries(filters.attrs)) {
    if (isAttrFilterEmpty(filter)) continue;
    attrFilters[key] =
      "values" in filter
        ? filter.values
        : "text" in filter
          ? { contains: filter.text.trim().slice(0, ATTR_TEXT_MAX) }
          : { min: filter.min, max: filter.max };
  }

  return {
    p_lat: center.lat,
    p_lng: center.lng,
    p_radius_km: filters.radius,
    p_category_ids: categoryId !== undefined ? [categoryId] : undefined,
    p_min_price: filters.minPrice,
    p_max_price: filters.maxPrice,
    p_attr_filters: JSON.parse(JSON.stringify(attrFilters)), // bỏ min/max undefined
    p_keyword: filters.q.trim() || undefined,
    p_sort: filters.sort,
    p_limit: page.limit,
    p_offset: page.offset,
  };
}
