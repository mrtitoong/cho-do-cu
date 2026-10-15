import { unstable_cache } from "next/cache";
import type { SearchResultItem } from "@/components/search/use-search-listings";
import { HOME_LATEST_LIMIT, HOME_REVALIDATE_SECONDS } from "@/config/home";
import type { PostCardData } from "@/lib/posts-data";
import { createPublicClient } from "@/lib/supabase/public";

/*
 * Dữ liệu trang chủ (chỉ dùng ở server). Toàn là dữ liệu công khai giống nhau với mọi người
 * nên đọc bằng client không cookie và cache HOME_REVALIDATE_SECONDS giây.
 * Lỗi thì ném ra để unstable_cache không lưu kết quả rỗng; trang tự bắt và ẩn khối tương ứng.
 */

/** Tag cache tin tức trên trang chủ: Admin đăng/sửa bài thì revalidateTag(POSTS_TAG). */
export const POSTS_TAG = "posts";

export type PublicStats = {
  total_users: number;
  total_transactions: number;
  active_listings: number;
  active_by_category: { category_id: number; slug: string; name: string; count: number }[];
};

export const getPublicStats = unstable_cache(
  async (): Promise<PublicStats> => {
    const { data, error } = await createPublicClient().rpc("get_public_stats");
    if (error) throw new Error(`get_public_stats: ${error.message}`);
    return data as unknown as PublicStats;
  },
  ["home:public-stats"],
  { revalidate: HOME_REVALIDATE_SECONDS },
);

/** Các tin mới nhất trên toàn nền tảng (không lọc vị trí). */
export const getLatestListings = unstable_cache(
  async (): Promise<SearchResultItem[]> => {
    const { data, error } = await createPublicClient().rpc("search_listings", {
      p_sort: "newest",
      p_limit: HOME_LATEST_LIMIT,
    });
    if (error) throw new Error(`search_listings: ${error.message}`);
    return (data ?? []) as SearchResultItem[];
  },
  ["home:latest-listings"],
  { revalidate: HOME_REVALIDATE_SECONDS },
);

const POST_COLUMNS = "id, slug, title, excerpt, cover_path, published_at, is_featured";

/** 1 bài nổi bật (nổi bật mới nhất, không có thì bài mới nhất) + 3 bài mới nhất khác. */
export const getHomePosts = unstable_cache(
  async (): Promise<{ featured: PostCardData | null; latest: PostCardData[] }> => {
    const supabase = createPublicClient();
    const [featuredRes, latestRes] = await Promise.all([
      supabase
        .from("posts")
        .select(POST_COLUMNS)
        .eq("status", "published")
        .eq("is_featured", true)
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("posts")
        .select(POST_COLUMNS)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .order("id")
        .limit(4),
    ]);
    if (featuredRes.error) throw new Error(`posts (nổi bật): ${featuredRes.error.message}`);
    if (latestRes.error) throw new Error(`posts (mới nhất): ${latestRes.error.message}`);

    const recent = (latestRes.data ?? []) as PostCardData[];
    const featured = (featuredRes.data as PostCardData | null) ?? recent[0] ?? null;
    return { featured, latest: recent.filter((p) => p.id !== featured?.id).slice(0, 3) };
  },
  ["home:posts"],
  { tags: [POSTS_TAG], revalidate: HOME_REVALIDATE_SECONDS },
);
