"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getMyAccount } from "@/lib/auth";
import { findSubCategory, getCategoryTree } from "@/lib/categories";
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

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

/**
 * Kiểm tra dữ liệu tin (dùng chung cho đăng và sửa tin). Mọi dữ liệu được kiểm tra lại trên server,
 * không tin dữ liệu từ trình duyệt; danh mục và trường riêng đọc lại từ DB (bảng categories).
 * Trả về các cột cần ghi + danh sách file đang có trong thư mục ảnh.
 */
async function validateListing(supabase: SupabaseServer, userId: string, input: CreateListingInput) {
  const sub = findSubCategory(await getCategoryTree(), input.categorySlug);
  if (!sub) return { ok: false as const, error: "Danh mục không hợp lệ hoặc đã ngừng nhận tin." };
  if (!z.uuid().safeParse(input.listingId).success) return { ok: false as const, error: "Mã tin không hợp lệ." };

  // 1. Thông tin chung + trường riêng
  const parsed = buildZodSchema(sub.fields, sub.priceLabel).safeParse(input.values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] ??= issue.message;
    }
    return {
      ok: false as const,
      error: "Thông tin chưa hợp lệ, vui lòng kiểm tra lại.",
      fieldErrors,
      step: "details" as const,
    };
  }

  // 2. Vị trí
  const location = listingLocationSchema.safeParse(input.location);
  if (!location.success) {
    return {
      ok: false as const,
      error: location.error.issues[0]?.message ?? "Vị trí không hợp lệ.",
      step: "location" as const,
    };
  }

  // 3. Ảnh: phải nằm trong thư mục {user_id}/{listing_id}/ và thật sự đã có trong Storage
  const folder = listingImageFolder(userId, input.listingId);
  const paths = Array.isArray(input.imagePaths) ? input.imagePaths : [];
  const fileNames = paths.map((p) => (typeof p === "string" && p.startsWith(`${folder}/`) ? p.slice(folder.length + 1) : ""));
  if (
    paths.length > MAX_LISTING_IMAGES ||
    new Set(fileNames).size !== fileNames.length ||
    fileNames.some((name) => !LISTING_IMAGE_FILE_RE.test(name))
  ) {
    return { ok: false as const, error: "Danh sách ảnh không hợp lệ.", step: "images" as const };
  }
  if (imagesRequired(sub) && paths.length === 0) {
    return { ok: false as const, error: "Vui lòng thêm ít nhất 1 ảnh.", step: "images" as const };
  }

  const { data: stored, error: listError } = await supabase.storage
    .from(LISTING_IMAGES_BUCKET)
    .list(folder, { limit: 100 });
  if (listError) {
    console.error("validateListing list images:", listError);
    return { ok: false as const, error: "Không kiểm tra được ảnh, vui lòng thử lại." };
  }
  const storedNames = new Set(stored.map((f) => f.name));
  if (fileNames.some((name) => !storedNames.has(name))) {
    return { ok: false as const, error: "Một số ảnh chưa tải lên xong, vui lòng thử lại.", step: "images" as const };
  }

  const { lat, lng, addressText, province, district } = location.data;
  return {
    ok: true as const,
    sub,
    paths,
    allStoredPaths: stored.map((f) => `${folder}/${f.name}`),
    row: {
      category_id: sub.id,
      ...toListingRow(sub, parsed.data),
      location: toGeographyPoint({ lat, lng }),
      address_text: addressText,
      province,
      district,
    },
  };
}

/**
 * Tạo tin mới.
 * Thứ tự: kiểm tra → ghi listing → ghi listing_images. Lỗi khi ghi thì xóa tin và ảnh đã upload.
 */
export async function createListing(input: CreateListingInput): Promise<CreateListingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập để đăng tin." };
  if ((await getMyAccount())?.is_banned) return { ok: false, error: "Tài khoản đã bị khóa, không đăng được tin." };

  const checked = await validateListing(supabase, user.id, input);
  if (!checked.ok) return checked;
  const { paths, allStoredPaths } = checked;
  const storage = supabase.storage.from(LISTING_IMAGES_BUCKET);

  // Ghi listing (seller_id mặc định = auth.uid(); public_location do trigger tự tính)
  const { error: insertError } = await supabase.from("listings").insert({ id: input.listingId, ...checked.row });
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

  // Ghi listing_images
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

export type UpdateListingInput = CreateListingInput;
export type UpdateListingResult =
  | { ok: true; id: string }
  | Omit<Extract<CreateListingResult, { ok: false }>, "imagesRemoved">;

/**
 * Sửa tin của mình. Không cho đổi danh mục chính, không đổi trạng thái.
 * Ảnh: thêm dòng listing_images mới rồi mới xóa dòng cũ (lỗi giữa chừng thì tin vẫn còn ảnh),
 * cuối cùng xóa trên Storage các file không còn dùng (ảnh đã bỏ ở form).
 */
export async function updateListing(input: UpdateListingInput): Promise<UpdateListingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập để sửa tin." };
  if (!z.uuid().safeParse(input.listingId).success) return { ok: false, error: "Mã tin không hợp lệ." };

  const { data: existing } = await supabase
    .from("listings")
    .select("id, category:categories(slug), images:listing_images(id)")
    .eq("id", input.listingId)
    .eq("seller_id", user.id)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Không tìm thấy tin hoặc bạn không có quyền sửa tin này." };

  const checked = await validateListing(supabase, user.id, input);
  if (!checked.ok) return checked;
  const { paths, allStoredPaths } = checked;

  const oldSub = findSubCategory(await getCategoryTree(), existing.category?.slug);
  // Danh mục cũ đã bị ẩn thì không xác định được danh mục chính → không cho đổi
  if (!oldSub || oldSub.parent !== checked.sub.parent) {
    return { ok: false, error: "Không được đổi danh mục chính của tin." };
  }

  const { error: updateError } = await supabase
    .from("listings")
    .update(checked.row)
    .eq("id", input.listingId)
    .eq("seller_id", user.id);
  if (updateError) {
    console.error("updateListing update listing:", updateError);
    return { ok: false, error: "Không lưu được thay đổi, vui lòng thử lại." };
  }

  if (paths.length > 0) {
    const { error: insertError } = await supabase
      .from("listing_images")
      .insert(paths.map((path, index) => ({ listing_id: input.listingId, path, sort_order: index })));
    if (insertError) {
      console.error("updateListing insert images:", insertError);
      return { ok: false, error: "Đã lưu thông tin nhưng chưa cập nhật được ảnh, vui lòng thử lại.", step: "images" };
    }
  }
  const oldImageIds = existing.images.map((i) => i.id);
  let oldRowsDeleted = true;
  if (oldImageIds.length > 0) {
    const { error: deleteError } = await supabase.from("listing_images").delete().in("id", oldImageIds);
    if (deleteError) console.error("updateListing delete old images:", deleteError);
    oldRowsDeleted = !deleteError;
  }

  // Chỉ xóa file khi dòng cũ đã xóa xong, để không có dòng nào trỏ tới file không còn tồn tại
  const keep = new Set(paths);
  const unused = allStoredPaths.filter((p) => !keep.has(p));
  if (oldRowsDeleted && unused.length > 0) {
    const { error: removeError } = await supabase.storage.from(LISTING_IMAGES_BUCKET).remove(unused);
    if (removeError) console.error("updateListing remove images:", removeError);
  }

  revalidatePath(`/tin/${input.listingId}`);
  revalidatePath("/tin-cua-toi");
  return { ok: true, id: input.listingId };
}
