import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginUrl } from "@/lib/auth-paths";

/** Lấy người dùng hiện tại; chưa đăng nhập thì chuyển về /dang-nhap rồi quay lại `currentPath`. */
export async function requireUser(currentPath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(loginUrl(currentPath));
  return user;
}

/** Vai trò và trạng thái khóa của người đang đăng nhập (null nếu chưa đăng nhập hoặc lỗi). */
export async function getMyAccount() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_account").maybeSingle();
  if (error) console.error("getMyAccount:", error);
  return data ?? null;
}
