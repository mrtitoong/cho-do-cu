"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { LISTING_IMAGES_BUCKET, listingImageFolder } from "@/lib/listing-images";
import { createClient } from "@/lib/supabase/server";

export type ListingStatus = "active" | "sold" | "hidden";
type ActionResult = { ok: true } | { ok: false; error: string };

const statusSchema = z.enum(["active", "sold", "hidden"]);

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function revalidateListing(listingId: string) {
  revalidatePath("/tin-cua-toi");
  revalidatePath(`/tin/${listingId}`);
}

/** Đổi trạng thái tin: Đang hiển thị / Đã bán / Đã ẩn (RLS chỉ cho chủ tin sửa). */
export async function setListingStatus(listingId: string, status: ListingStatus): Promise<ActionResult> {
  if (!z.uuid().safeParse(listingId).success) return { ok: false, error: "Mã tin không hợp lệ." };
  if (!statusSchema.safeParse(status).success) return { ok: false, error: "Trạng thái không hợp lệ." };

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập." };

  const { data, error } = await supabase
    .from("listings")
    .update({ status })
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("setListingStatus:", error);
    return { ok: false, error: "Không cập nhật được tin, vui lòng thử lại." };
  }

  revalidateListing(listingId);
  return { ok: true };
}

/**
 * Xóa tin và toàn bộ ảnh trong thư mục {user_id}/{listing_id}/ trên Storage.
 * listing_images, conversations, messages bị xóa theo (on delete cascade).
 */
export async function deleteListing(listingId: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(listingId).success) return { ok: false, error: "Mã tin không hợp lệ." };

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập." };

  const { data, error } = await supabase
    .from("listings")
    .delete()
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("deleteListing:", error);
    return { ok: false, error: "Không xóa được tin, vui lòng thử lại." };
  }

  // Liệt kê cả file thừa (không có trong listing_images) để dọn sạch thư mục của tin.
  // Tin đã xóa rồi nên lỗi ở đây chỉ để lại file rác, không báo lỗi cho người dùng.
  const storage = supabase.storage.from(LISTING_IMAGES_BUCKET);
  const folder = listingImageFolder(user.id, listingId);
  const { data: files, error: listError } = await storage.list(folder, { limit: 100 });
  if (listError) console.error("deleteListing list images:", listError);
  if (files?.length) {
    const { error: removeError } = await storage.remove(files.map((f) => `${folder}/${f.name}`));
    if (removeError) console.error("deleteListing remove images:", removeError);
  }

  revalidateListing(listingId);
  return { ok: true };
}
