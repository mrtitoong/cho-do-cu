import Link from "next/link";
import { Newspaper } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { PostCardData } from "@/lib/posts-data";
import { PostImage } from "./post-image";

/** Thẻ bài viết: ảnh bìa, tiêu đề, mô tả ngắn, ngày đăng. */
export function PostCard({ post }: { post: PostCardData }) {
  return (
    <Link
      href={`/tin-tuc/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-background transition-shadow hover:shadow-md"
    >
      {post.cover_path ? (
        <PostImage
          path={post.cover_path}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="aspect-[16/9]"
        />
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center bg-muted text-muted-foreground">
          <Newspaper className="size-8" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h2 className="line-clamp-2 font-semibold group-hover:text-primary">{post.title}</h2>
        {post.excerpt && <p className="line-clamp-3 text-sm text-muted-foreground">{post.excerpt}</p>}
        {post.published_at && (
          <time dateTime={post.published_at} className="mt-auto pt-1 text-xs text-muted-foreground">
            {formatDate(post.published_at)}
          </time>
        )}
      </div>
    </Link>
  );
}
