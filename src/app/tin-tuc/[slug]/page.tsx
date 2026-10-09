import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PostCard } from "@/components/posts/post-card";
import { PostContent } from "@/components/posts/post-content";
import { PostImage } from "@/components/posts/post-image";
import { formatDate } from "@/lib/format";
import { renderPostHtml } from "@/lib/post-html";
import { postImageUrl } from "@/lib/posts";
import { getPublishedPost, getRelatedPosts } from "@/lib/posts-data";
import { SITE_NAME } from "@/lib/site";

type Props = PageProps<"/tin-tuc/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedPost((await params).slug);
  if (!post) return { title: "Không tìm thấy bài viết" };

  const description = post.excerpt?.replace(/\s+/g, " ").slice(0, 160) || undefined;
  return {
    title: post.title,
    description,
    alternates: { canonical: `/tin-tuc/${post.slug}` },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      locale: "vi_VN",
      title: post.title,
      description,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      images: post.cover_path ? [{ url: postImageUrl(post.cover_path), alt: post.title }] : undefined,
    },
    twitter: { card: post.cover_path ? "summary_large_image" : "summary" },
  };
}

export default async function PostPage({ params }: Props) {
  const post = await getPublishedPost((await params).slug);
  if (!post) notFound();

  const related = await getRelatedPosts(post.id);
  const html = renderPostHtml(post.content);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link
        href="/tin-tuc"
        className="inline-flex h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Tin tức
      </Link>

      <article>
        <header className="mt-2 mb-6 space-y-3">
          <h1 className="text-2xl leading-tight font-bold tracking-tight sm:text-3xl">{post.title}</h1>
          {post.published_at && (
            <time dateTime={post.published_at} className="block text-sm text-muted-foreground">
              {formatDate(post.published_at)}
            </time>
          )}
          {post.excerpt && <p className="text-lg text-muted-foreground">{post.excerpt}</p>}
        </header>

        {post.cover_path && (
          <PostImage
            path={post.cover_path}
            alt={post.title}
            sizes="(min-width: 768px) 768px, 100vw"
            preload
            className="mb-6 aspect-[16/9] rounded-xl"
          />
        )}

        <PostContent html={html} />
      </article>

      {related.length > 0 && (
        <section className="mt-12 border-t pt-6">
          <h2 className="mb-4 text-lg font-bold">Bài viết khác</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
