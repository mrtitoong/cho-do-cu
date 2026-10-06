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

/** Toạ độ → giá trị cột geography (EWKT). Lưu ý PostGIS dùng thứ tự kinh độ trước. */
export function toGeographyPoint({ lat, lng }: { lat: number; lng: number }) {
  return `SRID=4326;POINT(${lng} ${lat})`;
}
