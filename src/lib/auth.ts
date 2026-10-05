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
