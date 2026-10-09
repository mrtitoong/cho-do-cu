import { compressImage } from "@/app/dang-tin/image-upload";
import { POST_IMAGES_BUCKET } from "@/lib/posts";
import { createClient } from "@/lib/supabase/client";

/**
 * Nén ảnh trên trình duyệt (cạnh dài 1600px, WebP) rồi upload vào bucket post-images.
 * RLS Storage chỉ cho Admin upload. Trả về đường dẫn trong bucket: {folder}/{uuid}.webp
 */
export async function uploadPostImage(file: File, folder: "covers" | "content"): Promise<string> {
  const { blob, ext } = await compressImage(file);
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient().storage.from(POST_IMAGES_BUCKET).upload(path, blob, {
    contentType: blob.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}
