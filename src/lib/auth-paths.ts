/** Các đường dẫn bắt buộc đăng nhập (kể cả trang con). */
export const PROTECTED_PATHS = ["/dang-tin", "/tin-nhan", "/tin-cua-toi", "/ho-so"];

export function isProtectedPath(pathname: string) {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Chỉ chấp nhận đường dẫn nội bộ để tránh open redirect. */
export function safeNextPath(next: string | null | undefined, fallback = "/") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}

export function loginUrl(next: string) {
  return `/dang-nhap?next=${encodeURIComponent(next)}`;
}
