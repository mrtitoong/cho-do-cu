"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { loginUrl } from "@/lib/auth-paths";
import { createClient } from "@/lib/supabase/server";

type ActionError = { ok: false; error: string };

/**
 * Tạo (hoặc lấy lại) cuộc trò chuyện giữa người đang xem và người bán, rồi chuyển đến /tin-nhan/[id].
 * Chưa đăng nhập thì chuyển đến /dang-nhap rồi quay lại tin.
 */
export async function startConversation(listingId: string): Promise<ActionError> {
  if (!z.uuid().safeParse(listingId).success) return { ok: false, error: "Mã tin không hợp lệ." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginUrl(`/tin/${listingId}`));

  const findExisting = () =>
    supabase.from("conversations").select("id").eq("listing_id", listingId).eq("buyer_id", user.id).maybeSingle();

  const { data: existing } = await findExisting();
  if (existing) redirect(`/tin-nhan/${existing.id}`);

  const { data: listing } = await supabase
    .from("listings")
    .select("seller_id, status")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || listing.status !== "active") return { ok: false, error: "Tin này không còn nhận liên hệ." };
  if (listing.seller_id === user.id) return { ok: false, error: "Đây là tin của bạn." };

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ listing_id: listingId, buyer_id: user.id, seller_id: listing.seller_id })
    .select("id")
    .single();

  if (error) {
    // 23505 = hai request song song cùng tạo → lấy lại cuộc trò chuyện đã có
    if (error.code === "23505") {
      const { data: again } = await findExisting();
      if (again) redirect(`/tin-nhan/${again.id}`);
    }
    console.error("startConversation:", error);
    return { ok: false, error: "Không mở được cuộc trò chuyện, vui lòng thử lại." };
  }
  redirect(`/tin-nhan/${created.id}`);
}

/** Chủ tin đánh dấu tin đã bán (RLS chỉ cho chủ tin sửa). */
export async function markListingSold(listingId: string): Promise<{ ok: true } | ActionError> {
  if (!z.uuid().safeParse(listingId).success) return { ok: false, error: "Mã tin không hợp lệ." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập." };

  const { data, error } = await supabase
    .from("listings")
    .update({ status: "sold" })
    .eq("id", listingId)
    .eq("seller_id", user.id)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("markListingSold:", error);
    return { ok: false, error: "Không cập nhật được tin, vui lòng thử lại." };
  }

  revalidatePath(`/tin/${listingId}`);
  return { ok: true };
}
