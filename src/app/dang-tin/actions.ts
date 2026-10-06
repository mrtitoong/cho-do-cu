"use server";

import { z } from "zod";
import { getSubCategory } from "@/config/categories";
import {
  imagesRequired,
  LISTING_IMAGE_FILE_RE,
  LISTING_IMAGES_BUCKET,
  listingImageFolder,
  MAX_LISTING_IMAGES,
} from "@/lib/listing-images";
import { listingLocationSchema, toGeographyPoint } from "@/lib/listing-location";
import { buildZodSchema, toListingRow } from "@/lib/listing-schema";
import { createClient } from "@/lib/supabase/server";

export type CreateListingInput = {
  /** uuid do trình duyệt sinh sẵn (ảnh đã được upload vào thư mục mang id này) */
  listingId: string;
  categorySlug: string;
  values: unknown;
  /** Đường dẫn ảnh trong Storage, theo thứ tự hiển thị (ảnh đầu là ảnh bìa) */
  imagePaths: string[];
  location: unknown;
};

export type CreateListingResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string>;
      /** Bước cần quay lại để sửa */
      step?: "details" | "images" | "location";
      /** Server đã xóa ảnh đã upload (để không để lại rác) → trình duyệt cần upload lại */
      imagesRemoved?: boolean;
    };

/**
 * Tạo tin mới. Mọi dữ liệu được kiểm tra lại trên server, không tin dữ liệu từ trình duyệt.
 * Thứ tự: kiểm tra → ghi listing → ghi listing_images. Lỗi khi ghi thì xóa tin và ảnh đã upload.
 */
export async function createListing(input: CreateListingInput): Promise<CreateListingResult> {
  const sub = getSubCategory(input.categorySlug);
  if (!sub) return { ok: false, error: "Danh mục không hợp lệ." };
  if (!z.uuid().safeParse(input.listingId).success) return { ok: false, error: "Mã tin không hợp lệ." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập để đăng tin." };

  // 1. Thông tin chung + trường riêng
  const parsed = buildZodSchema(sub.slug).safeParse(input.values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] ??= issue.message;
    }
    return { ok: false, error: "Thông tin chưa hợp lệ, vui lòng kiểm tra lại.", fieldErrors, step: "details" };
  }

  // 2. Vị trí
  const location = listingLocationSchema.safeParse(input.location);
  if (!location.success) {
    return { ok: false, error: location.error.issues[0]?.message ?? "Vị trí không hợp lệ.", step: "location" };
  }

  // 3. Ảnh: phải nằm trong thư mục {user_id}/{listing_id}/ và thật sự đã có trong Storage
  const folder = listingImageFolder(user.id, input.listingId);
  const paths = Array.isArray(input.imagePaths) ? input.imagePaths : [];
  const fileNames = paths.map((p) => (typeof p === "string" && p.startsWith(`${folder}/`) ? p.slice(folder.length + 1) : ""));
  if (
    paths.length > MAX_LISTING_IMAGES ||
    new Set(fileNames).size !== fileNames.length ||
    fileNames.some((name) => !LISTING_IMAGE_FILE_RE.test(name))
  ) {
    return { ok: false, error: "Danh sách ảnh không hợp lệ.", step: "images" };
  }
  if (imagesRequired(sub) && paths.length === 0) {
    return { ok: false, error: "Vui lòng thêm ít nhất 1 ảnh.", step: "images" };
  }

  const storage = supabase.storage.from(LISTING_IMAGES_BUCKET);
  const { data: stored, error: listError } = await storage.list(folder, { limit: 100 });
  if (listError) {
    console.error("createListing list images:", listError);
    return { ok: false, error: "Không kiểm tra được ảnh, vui lòng thử lại." };
  }
  const storedNames = new Set(stored.map((f) => f.name));
  if (fileNames.some((name) => !storedNames.has(name))) {
    return { ok: false, error: "Một số ảnh chưa tải lên xong, vui lòng thử lại.", step: "images" };
  }
  const allStoredPaths = stored.map((f) => `${folder}/${f.name}`);

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", sub.slug)
    .single();
  if (categoryError || !category) return { ok: false, error: "Không tìm thấy danh mục trong cơ sở dữ liệu." };

  // 4. Ghi listing (seller_id mặc định = auth.uid(); public_location do trigger tự tính)
  const { lat, lng, addressText, province, district } = location.data;
  const { error: insertError } = await supabase.from("listings").insert({
    id: input.listingId,
    category_id: category.id,
    ...toListingRow(sub, parsed.data),
    location: toGeographyPoint({ lat, lng }),
    address_text: addressText,
    province,
    district,
  });
  if (insertError) {
    console.error("createListing insert listing:", insertError);
    // 23505 = trùng id: tin này đã được đăng (VD bấm gửi lại sau khi mất mạng) → không được xóa ảnh của nó
    if (insertError.code === "23505") {
      const { data: existing } = await supabase
        .from("listings")
        .select("id")
        .eq("id", input.listingId)
        .eq("seller_id", user.id)
        .maybeSingle();
      return existing ? { ok: true, id: existing.id } : { ok: false, error: "Mã tin bị trùng, vui lòng tải lại trang." };
    }
    await storage.remove(allStoredPaths);
    return { ok: false, error: "Không đăng được tin, vui lòng thử lại.", imagesRemoved: true };
  }

  // 5. Ghi listing_images
  if (paths.length > 0) {
    const { error: imagesError } = await supabase
      .from("listing_images")
      .insert(paths.map((path, index) => ({ listing_id: input.listingId, path, sort_order: index })));
    if (imagesError) {
      console.error("createListing insert images:", imagesError);
      await supabase.from("listings").delete().eq("id", input.listingId);
      await storage.remove(allStoredPaths);
      return { ok: false, error: "Không lưu được ảnh, vui lòng thử lại.", imagesRemoved: true };
    }
  }

  // Dọn file thừa trong thư mục (ảnh đã xóa ở form nhưng xóa trên Storage bị lỗi)
  const keep = new Set(paths);
  const extra = allStoredPaths.filter((p) => !keep.has(p));
  if (extra.length > 0) await storage.remove(extra);

  return { ok: true, id: input.listingId };
}
