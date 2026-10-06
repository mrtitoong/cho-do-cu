import { z } from "zod";
import { VIETNAM_BOUNDS } from "@/config/map";

/** Vị trí tin đăng mà người bán chọn ở Bước 4 (toạ độ thật, không bao giờ hiển thị công khai). */
export type ListingLocation = {
  lat: number;
  lng: number;
  /** Khu vực gần đúng (phường, quận, tỉnh) — KHÔNG chứa số nhà, tên đường vì cột này công khai. */
  addressText: string | null;
  province: string | null;
  district: string | null;
};

const optionalText = z
  .string()
  .trim()
  .max(255)
  .nullable()
  .transform((v) => v || null);

const { minLat, maxLat, minLng, maxLng } = VIETNAM_BOUNDS;
const outside = "Vị trí phải nằm trong lãnh thổ Việt Nam";

export const listingLocationSchema = z.object(
  {
    lat: z.number().min(minLat, outside).max(maxLat, outside),
    lng: z.number().min(minLng, outside).max(maxLng, outside),
    addressText: optionalText,
    province: optionalText,
    district: optionalText,
  },
  { error: "Vui lòng chọn vị trí trên bản đồ" },
);

/**
 * Đọc giá trị cột geography(Point) mà PostgREST trả về: chuỗi EWKB dạng hex
 * (VD "0101000020E6100000...") hoặc GeoJSON { type: "Point", coordinates: [lng, lat] }.
 */
export function parseGeographyPoint(value: unknown): { lat: number; lng: number } | null {
  if (value && typeof value === "object") {
    const coords = (value as { coordinates?: unknown }).coordinates;
    if (Array.isArray(coords) && typeof coords[0] === "number" && typeof coords[1] === "number") {
      return { lat: coords[1], lng: coords[0] };
    }
    return null;
  }
  if (typeof value !== "string" || !/^[0-9a-f]+$/i.test(value) || value.length < 42) return null;

  const bytes = new Uint8Array(value.match(/../g)!.map((h) => parseInt(h, 16)));
  const view = new DataView(bytes.buffer);
  const le = bytes[0] === 1;
  const type = view.getUint32(1, le);
  if ((type & 0xff) !== 1) return null; // không phải Point
  const offset = type & 0x20000000 ? 9 : 5; // có SRID thì bỏ qua 4 byte SRID
  if (bytes.length < offset + 16) return null;
  const lng = view.getFloat64(offset, le);
  const lat = view.getFloat64(offset + 8, le);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

/** Toạ độ → giá trị cột geography (EWKT). Lưu ý PostGIS dùng thứ tự kinh độ trước. */
export function toGeographyPoint({ lat, lng }: { lat: number; lng: number }) {
  return `SRID=4326;POINT(${lng} ${lat})`;
}
