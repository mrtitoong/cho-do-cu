import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isProtectedPath, loginUrl } from "@/lib/auth-paths";

/** Làm mới phiên đăng nhập và chặn các trang cần đăng nhập. Gọi từ src/proxy.ts. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Không chèn code giữa createServerClient và getClaims(), nếu không phiên có thể bị đăng xuất ngẫu nhiên.
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);

  const { pathname, search } = request.nextUrl;
  const redirectTo = (target: string) => {
    const redirectResponse = NextResponse.redirect(new URL(target, request.url));
    // Giữ lại cookie vừa làm mới (nếu có).
    response.cookies.getAll().forEach((c) => redirectResponse.cookies.set(c));
    return redirectResponse;
  };

  if (!isLoggedIn && (isProtectedPath(pathname) || isAdminPath(pathname))) {
    return redirectTo(loginUrl(pathname + search));
  }

  // Lớp 1/3 bảo vệ khu vực Admin (layout và Server Action kiểm tra lại trên server).
  if (isAdminPath(pathname)) {
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (isAdmin !== true) return redirectTo("/");
  }

  // "Lần hoạt động cuối": tối đa 1 lần / 5 phút, đánh dấu bằng cookie để không gọi DB mỗi request.
  if (isLoggedIn && !request.cookies.has(LAST_SEEN_COOKIE)) {
    const { error } = await supabase.rpc("touch_last_seen");
    if (!error) {
      response.cookies.set(LAST_SEEN_COOKIE, "1", { maxAge: 5 * 60, httpOnly: true, sameSite: "lax", path: "/" });
    }
  }

  return response;
}

const LAST_SEEN_COOKIE = "cdc_seen";

function isAdminPath(pathname: string) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}
