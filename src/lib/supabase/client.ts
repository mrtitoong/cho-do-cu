import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

/** Supabase client dùng trong Client Component (chạy trên trình duyệt). */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
