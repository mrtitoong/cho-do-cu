"use server";

import { createClient } from "@/lib/supabase/server";
import { phoneSchema } from "@/lib/phone";

/** Cập nhật số điện thoại của chính mình (để trống = xóa số, người mua chỉ chat được). */
export async function updatePhone(input: string): Promise<{ ok: true; phone: string | null } | { ok: false; error: string }> {
  const parsed = phoneSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Số điện thoại không hợp lệ." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập." };

  const { error } = await supabase.from("profiles").update({ phone: parsed.data }).eq("id", user.id);
  if (error) {
    console.error("updatePhone:", error);
    return { ok: false, error: "Không lưu được số điện thoại, vui lòng thử lại." };
  }
  return { ok: true, phone: parsed.data };
}
