"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { adminErrorMessage, requireAdmin } from "@/lib/admin";

/*
 * Server Action của khu vực Admin. Lớp 3/3: mọi action gọi requireAdmin() trước khi làm gì.
 * Thay đổi thực hiện qua hàm SQL admin_* (tự kiểm tra is_admin() lần nữa và ghi admin_logs
 * trong cùng giao dịch), nên không có thao tác nào thiếu nhật ký.
 */

export type AdminActionResult = { ok: true } | { ok: false; error: string };

const NOT_ADMIN: AdminActionResult = { ok: false, error: "Bạn không có quyền quản trị." };
const uuid = z.uuid();
const reasonSchema = z.string().trim().min(1, "Vui lòng nhập lý do.").max(500, "Lý do tối đa 500 ký tự.");

function revalidateUser(userId: string) {
  revalidatePath("/admin/nguoi-dung");
  revalidatePath(`/admin/nguoi-dung/${userId}`);
  revalidatePath("/admin/tin-dang");
  revalidatePath("/admin/nhat-ky");
}

/** Khóa tài khoản: bắt buộc lý do; mọi tin đang bán của người đó tự chuyển sang ẩn. */
export async function banUser(userId: string, reason: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!admin) return NOT_ADMIN;
  if (!uuid.safeParse(userId).success) return { ok: false, error: "Mã người dùng không hợp lệ." };
  const parsedReason = reasonSchema.safeParse(reason);
  if (!parsedReason.success) return { ok: false, error: parsedReason.error.issues[0].message };
  if (userId === admin.user.id) return { ok: false, error: "Bạn không thể tự khóa tài khoản của mình." };

  const { error } = await admin.supabase.rpc("admin_set_user_ban", {
    p_user_id: userId,
    p_banned: true,
    p_reason: parsedReason.data,
  });
  if (error) {
    console.error("banUser:", error);
    return { ok: false, error: adminErrorMessage(error, "Không khóa được tài khoản, vui lòng thử lại.") };
  }
  revalidateUser(userId);
  return { ok: true };
}

export async function unbanUser(userId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!admin) return NOT_ADMIN;
  if (!uuid.safeParse(userId).success) return { ok: false, error: "Mã người dùng không hợp lệ." };

  const { error } = await admin.supabase.rpc("admin_set_user_ban", { p_user_id: userId, p_banned: false });
  if (error) {
    console.error("unbanUser:", error);
    return { ok: false, error: adminErrorMessage(error, "Không mở khóa được tài khoản, vui lòng thử lại.") };
  }
  revalidateUser(userId);
  return { ok: true };
}

/** Cấp / thu quyền admin. Admin không tự thu quyền của chính mình. */
export async function setUserRole(userId: string, role: "user" | "admin"): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!admin) return NOT_ADMIN;
  if (!uuid.safeParse(userId).success) return { ok: false, error: "Mã người dùng không hợp lệ." };
  if (role !== "user" && role !== "admin") return { ok: false, error: "Vai trò không hợp lệ." };
  if (userId === admin.user.id) return { ok: false, error: "Bạn không thể tự đổi vai trò của mình." };

  const { error } = await admin.supabase.rpc("admin_set_user_role", { p_user_id: userId, p_role: role });
  if (error) {
    console.error("setUserRole:", error);
    return { ok: false, error: adminErrorMessage(error, "Không đổi được vai trò, vui lòng thử lại.") };
  }
  revalidateUser(userId);
  return { ok: true };
}

function revalidateListing(listingId: string) {
  revalidatePath("/admin/tin-dang");
  revalidatePath("/admin/nguoi-dung", "layout");
  revalidatePath("/admin/nhat-ky");
  revalidatePath(`/tin/${listingId}`);
}

/** Gỡ tin (status = 'removed'), bắt buộc lý do. */
export async function removeListing(listingId: string, reason: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!admin) return NOT_ADMIN;
  if (!uuid.safeParse(listingId).success) return { ok: false, error: "Mã tin không hợp lệ." };
  const parsedReason = reasonSchema.safeParse(reason);
  if (!parsedReason.success) return { ok: false, error: parsedReason.error.issues[0].message };

  const { error } = await admin.supabase.rpc("admin_set_listing_status", {
    p_listing_id: listingId,
    p_action: "remove",
    p_reason: parsedReason.data,
  });
  if (error) {
    console.error("removeListing:", error);
    return { ok: false, error: adminErrorMessage(error, "Không gỡ được tin, vui lòng thử lại.") };
  }
  revalidateListing(listingId);
  return { ok: true };
}

/** Khôi phục tin đã gỡ (đã bán → 'sold', người đăng bị khóa → 'hidden', còn lại → 'active'). */
export async function restoreListing(listingId: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!admin) return NOT_ADMIN;
  if (!uuid.safeParse(listingId).success) return { ok: false, error: "Mã tin không hợp lệ." };

  const { error } = await admin.supabase.rpc("admin_set_listing_status", {
    p_listing_id: listingId,
    p_action: "restore",
  });
  if (error) {
    console.error("restoreListing:", error);
    return { ok: false, error: adminErrorMessage(error, "Không khôi phục được tin, vui lòng thử lại.") };
  }
  revalidateListing(listingId);
  return { ok: true };
}
