import { createClient } from "@/lib/supabase/server";

export type SessionUser = {
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

/** Thông tin hiển thị của người đang đăng nhập (null nếu chưa đăng nhập). */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    email: str(claims.email),
    name: str(meta.full_name) ?? str(meta.name),
    avatarUrl: str(meta.avatar_url) ?? str(meta.picture),
  };
}
