/*
 * Tìm địa chỉ / reverse geocoding bằng Nominatim (OpenStreetMap), gọi từ trình duyệt.
 * Chính sách Nominatim yêu cầu gửi Referer hoặc User-Agent hợp lệ. Trình duyệt cấm JS tự đặt
 * header Referer, nên ta đặt referrerPolicy để trình duyệt luôn gửi Referer (origin của website).
 * Giới hạn ~1 yêu cầu/giây: ô tìm kiếm chờ 500 ms sau khi ngừng gõ mới gọi.
 */

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";

type NominatimAddress = Partial<
  Record<
    | "state"
    | "province"
    | "city"
    | "town"
    | "county"
    | "city_district"
    | "district"
    | "suburb"
    | "quarter"
    | "village"
    | "hamlet",
    string
  >
>;

type NominatimPlace = {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address?: NominatimAddress;
};

/** Khu vực gần đúng của một điểm. Cố ý KHÔNG lấy số nhà, tên đường vì address_text hiển thị công khai. */
export type Area = { addressText: string | null; province: string | null; district: string | null };

export type SearchResult = Area & { id: number; label: string; lat: number; lng: number };

async function nominatim<T>(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const query = new URLSearchParams({ format: "jsonv2", addressdetails: "1", "accept-language": "vi", ...params });
  const res = await fetch(`${NOMINATIM_URL}/${path}?${query}`, {
    signal,
    referrerPolicy: "strict-origin-when-cross-origin",
  });
  if (!res.ok) throw new Error(`Nominatim lỗi ${res.status}`);
  return res.json();
}

function toArea(address: NominatimAddress = {}): Area {
  const province = address.state ?? address.province ?? address.city ?? null;
  const district =
    address.city_district ??
    address.county ??
    address.district ??
    address.town ??
    (address.city && address.city !== province ? address.city : null);
  const ward = address.suburb ?? address.quarter ?? address.village ?? address.hamlet ?? null;

  const parts = [ward, district, province].filter((p, i, all): p is string => Boolean(p) && all.indexOf(p) === i);
  return { addressText: parts.join(", ") || null, province, district: district ?? null };
}

/** Tìm địa chỉ trong Việt Nam. */
export async function searchAddress(q: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const places = await nominatim<NominatimPlace[]>("search", { q, countrycodes: "vn", limit: "5" }, signal);
  return places.map((p) => ({
    id: p.place_id,
    label: p.display_name,
    lat: Number(p.lat),
    lng: Number(p.lon),
    ...toArea(p.address),
  }));
}

/** Toạ độ → khu vực (phường, quận, tỉnh). */
export async function reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<Area> {
  const place = await nominatim<NominatimPlace & { error?: string }>(
    "reverse",
    { lat: String(lat), lon: String(lng), zoom: "16" },
    signal,
  );
  if (place.error) return { addressText: null, province: null, district: null };
  return toArea(place.address);
}
