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

  // Đã bán phải đi qua markListingSold (tạo giao dịch); DB cũng chặn đổi thẳng sang 'sold'.
  if (status === "sold") return { ok: false, error: "Vui lòng dùng nút Đánh dấu đã bán." };

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

export type BuyerCandidate = { id: string; name: string | null; avatarUrl: string | null };

/** Những người đã chat về tin (để chọn người mua khi đánh dấu đã bán), người nhắn gần nhất trước. */
export async function getBuyerCandidates(
  listingId: string,
): Promise<{ ok: true; buyers: BuyerCandidate[] } | { ok: false; error: string }> {
  if (!z.uuid().safeParse(listingId).success) return { ok: false, error: "Mã tin không hợp lệ." };

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập." };

  // RLS: chỉ người bán/người mua đọc được conversation → lọc thêm seller_id = mình
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("buyer_id")
    .eq("listing_id", listingId)
    .eq("seller_id", user.id)
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (error) {
    console.error("getBuyerCandidates:", error);
    return { ok: false, error: "Không tải được danh sách người mua." };
  }

  const ids = [...new Set(conversations.map((c) => c.buyer_id))];
  if (ids.length === 0) return { ok: true, buyers: [] };

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", ids);
  if (profileError) console.error("getBuyerCandidates profiles:", profileError);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  return {
    ok: true,
    buyers: ids.map((id) => ({
      id,
      name: byId.get(id)?.full_name ?? null,
      avatarUrl: byId.get(id)?.avatar_url ?? null,
    })),
  };
}

const markSoldSchema = z.object({
  listingId: z.uuid(),
  buyerId: z.uuid().nullable(),
  finalPrice: z.number().int().min(0).max(1e15).nullable(),
});

/**
 * Đánh dấu đã bán: hàm SQL mark_listing_sold đổi status = 'sold' và tạo 1 dòng transactions
 * trong cùng giao dịch. buyerId null = người mua ngoài nền tảng; finalPrice null = giá đăng.
 */
export async function markListingSold(input: z.input<typeof markSoldSchema>): Promise<ActionResult> {
  const parsed = markSoldSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Dữ liệu không hợp lệ." };
  const { listingId, buyerId, finalPrice } = parsed.data;

  const { supabase, user } = await currentUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập." };

  const { error } = await supabase.rpc("mark_listing_sold", {
    p_listing_id: listingId,
    p_buyer_id: buyerId ?? undefined,
    p_final_price: finalPrice ?? undefined,
  });
  if (error) {
    console.error("markListingSold:", error);
    const message =
      error.code === "23505"
        ? "Tin này đã được đánh dấu đã bán."
        : error.code === "23514" || error.code === "42501"
          ? error.message
          : "Không đánh dấu đã bán được, vui lòng thử lại.";
    return { ok: false, error: message };
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
