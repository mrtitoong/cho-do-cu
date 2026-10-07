import { notFound, redirect } from "next/navigation";
import { loginUrl } from "@/lib/auth-paths";
import { createClient } from "@/lib/supabase/server";

/*
 * Quyền Admin kiểm tra ở 3 lớp:
 *   1. src/lib/supabase/proxy.ts chặn /admin nếu không phải admin,
 *   2. src/app/admin/layout.tsx gọi requireAdminPage() trên server,
 *   3. mọi Server Action của admin gọi requireAdmin() trước khi làm gì.
 * Cuối cùng các hàm SQL admin_* vẫn tự kiểm tra is_admin() (lớp DB).
 */

/** Người đang đăng nhập có phải admin không (hỏi DB qua hàm is_admin()). */
export async function isCurrentUserAdmin() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("is_admin");
  if (error) console.error("isCurrentUserAdmin:", error);
  return data === true;
}

/** Dùng trong Server Action: trả về client + user nếu là admin, ngược lại null. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error) console.error("requireAdmin:", error);
  if (isAdmin !== true) return null;
  return { supabase, user };
}

/** Dùng trong layout / page của /admin: chưa đăng nhập → trang đăng nhập; không phải admin → 404. */
export async function requireAdminPage(currentPath = "/admin") {
  const admin = await requireAdmin();
  if (admin) return admin;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect(loginUrl(currentPath));
  notFound();
}

/** Lỗi do hàm SQL admin_* raise (thông báo tiếng Việt) thì hiện nguyên văn, lỗi khác hiện câu chung. */
export function adminErrorMessage(error: { code?: string; message: string }, fallback: string) {
  const known = ["42501", "23514", "P0002", "22023"];
  return error.code && known.includes(error.code) ? error.message : fallback;
}

export const ADMIN_PAGE_SIZE = 20;

/** "?trang=3" → 3 (sai thì 1). */
export function parsePage(value: string | string[] | undefined) {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

/** Lấy 1 giá trị chuỗi từ searchParams của Next. */
export function param(value: string | string[] | undefined) {
  const v = Array.isArray(value) ? value[0] : value;
  return v?.trim() || undefined;
}
