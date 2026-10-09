import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin";
import { EMPTY_POST_CONTENT, type PostInput, type PostStatus } from "@/lib/posts";
import { PostEditor } from "../post-editor";

export const metadata: Metadata = { title: "Sửa bài viết" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditPostPage({ params }: PageProps<"/admin/tin-tuc/[id]">) {
  const { id } = await params;
  const { supabase } = await requireAdminPage(`/admin/tin-tuc/${id}`);
  if (!UUID_RE.test(id)) notFound();

  const { data: post, error } = await supabase
    .from("posts")
    .select("id, slug, title, excerpt, cover_path, content, status, is_featured, published_at")
    .eq("id", id)
    .maybeSingle();
  if (error) console.error("EditPostPage:", error);
  if (!post) notFound();

  const content = (post.content as { type?: string } | null)?.type === "doc" ? post.content : EMPTY_POST_CONTENT;

  return (
    <PostEditor
      // đổi bài thì tạo lại trình soạn từ đầu
      key={post.id}
      post={{
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt ?? "",
        coverPath: post.cover_path,
        isFeatured: post.is_featured,
        content: content as PostInput["content"],
        status: post.status as PostStatus,
        publishedAt: post.published_at,
      }}
    />
  );
}
