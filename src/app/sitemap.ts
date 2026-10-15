import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/site";
import type { Database } from "@/types/database";

// Tạo lại sitemap tối đa mỗi giờ một lần
export const revalidate = 3600;

const MAX_URLS = 50_000; // giới hạn của một file sitemap
const PAGE_SIZE = 1000;

/** sitemap.xml: trang chủ, tin tức + các bài đã đăng, các tin đang bán. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const home: MetadataRoute.Sitemap[number] = { url: SITE_URL, changeFrequency: "hourly", priority: 1 };

  // Client không đọc cookie (dữ liệu công khai, như khách chưa đăng nhập) để sitemap được cache
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  // Supabase trả tối đa 1000 dòng mỗi lần → lấy theo từng trang
  const listings: { id: string; updated_at: string }[] = [];
  while (listings.length < MAX_URLS - 1) {
    const from = listings.length;
    const { data, error } = await supabase
      .from("listings")
      .select("id, updated_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, Math.min(from + PAGE_SIZE, MAX_URLS - 1) - 1);
    if (error) {
      console.error("sitemap:", error);
      break;
    }
    listings.push(...data);
    if (data.length < PAGE_SIZE) break;
  }

  const { data: posts, error: postsError } = await supabase
    .from("posts")
    .select("slug, updated_at")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1000);
  if (postsError) console.error("sitemap posts:", postsError);

  return [
    home,
    { url: `${SITE_URL}/tin-tuc`, changeFrequency: "daily", priority: 0.6 },
    ...(posts ?? []).map((p) => ({
      url: `${SITE_URL}/tin-tuc/${p.slug}`,
      lastModified: p.updated_at,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...listings.map((l) => ({
      url: `${SITE_URL}/tin/${l.id}`,
      lastModified: l.updated_at,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
