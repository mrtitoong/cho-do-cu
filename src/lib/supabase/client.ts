import { createBrowserClient } from "@supabase/ssr";

/** Supabase client dùng trong Client Component (chạy trên trình duyệt). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
