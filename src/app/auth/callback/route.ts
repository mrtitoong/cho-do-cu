import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/auth-paths";
import { createClient } from "@/lib/supabase/server";

/**
 * Nơi Supabase chuyển về sau khi: đăng nhập Google, bấm link xác nhận email,
 * hoặc bấm link đặt lại mật khẩu. Đổi mã lấy phiên rồi chuyển tới `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  }

  if (ok) {
    return NextResponse.redirect(new URL(next, origin));
  }

  const loginUrl = new URL("/dang-nhap", origin);
  loginUrl.searchParams.set("loi", "xac-thuc");
  loginUrl.searchParams.set("next", next);
  return NextResponse.redirect(loginUrl);
}
