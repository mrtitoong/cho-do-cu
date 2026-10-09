import { cache } from "react";
import { POSTS_PAGE_SIZE } from "@/lib/posts";
import { createPublicClient } from "@/lib/supabase/public";

/* Đọc tin tức đã đăng cho trang công khai (RLS chỉ trả bài status = 'published'). */

const CARD_COLUMNS = "id, slug, title, excerpt, cover_path, published_at, is_featured";

export type PostCardData = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_path: string | null;
  published_at: string | null;
  is_featured: boolean;
};

/** Danh sách bài đã đăng, mới nhất trước, phân trang POSTS_PAGE_SIZE bài. */
export async function getPublishedPosts(page: number) {
  const supabase = createPublicClient();
  const from = (page - 1) * POSTS_PAGE_SIZE;
  const { data, count, error } = await supabase
    .from("posts")
    .select(CARD_COLUMNS, { count: "exact" })
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .order("id")
    .range(from, from + POSTS_PAGE_SIZE - 1);
  if (error) console.error("getPublishedPosts:", error);
  return { posts: (data ?? []) as PostCardData[], total: count ?? 0, error };
}

/** Một bài đã đăng theo slug (dùng chung cho generateMetadata và trang). */
export const getPublishedPost = cache(async (slug: string) => {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("posts")
    .select(`${CARD_COLUMNS}, content, updated_at`)
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  if (error) console.error("getPublishedPost:", error);
  return data;
});

/** Bài liên quan: các bài đã đăng mới nhất khác bài đang xem. */
export async function getRelatedPosts(excludeId: string, limit = 3) {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("posts")
    .select(CARD_COLUMNS)
    .eq("status", "published")
    .neq("id", excludeId)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) console.error("getRelatedPosts:", error);
  return (data ?? []) as PostCardData[];
}
