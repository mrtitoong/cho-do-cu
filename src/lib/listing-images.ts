import type { SubCategory } from "@/lib/category-tree";

/** Bucket Storage chứa ảnh tin đăng (công khai để đọc). */
export const LISTING_IMAGES_BUCKET = "listing-images";
export const MAX_LISTING_IMAGES = 10;

/** Danh mục có bắt buộc ít nhất 1 ảnh không (cột categories.requires_images, VD Việc làm không bắt buộc). */
export function imagesRequired(sub: SubCategory) {
  return sub.requiresImages;
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
