import type { SubCategory } from "@/config/categories";

/** Bucket Storage chứa ảnh tin đăng (công khai để đọc). */
export const LISTING_IMAGES_BUCKET = "listing-images";
export const MAX_LISTING_IMAGES = 10;

/** Danh mục Việc làm không bắt buộc ảnh; các danh mục khác cần ít nhất 1 ảnh. */
export function imagesRequired(sub: SubCategory) {
  return sub.parent !== "viec-lam";
}

/** Thư mục chứa ảnh của một tin: {user_id}/{listing_id} */
export function listingImageFolder(userId: string, listingId: string) {
  return `${userId}/${listingId}`;
}

/** Tên file hợp lệ trong thư mục của tin: {uuid}.webp (hoặc .jpg với trình duyệt cũ không nén được WebP). */
export const LISTING_IMAGE_FILE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg)$/;

/** URL công khai của ảnh trong bucket. */
export function listingImageUrl(path: string) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${LISTING_IMAGES_BUCKET}/${encoded}`;
}
