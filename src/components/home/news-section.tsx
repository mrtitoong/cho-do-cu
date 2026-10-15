import Link from "next/link";
import { Newspaper } from "lucide-react";
import { PostCard } from "@/components/posts/post-card";
import { PostImage } from "@/components/posts/post-image";
import { formatDate } from "@/lib/format";
import type { PostCardData } from "@/lib/posts-data";

/** Bài nổi bật: ảnh lớn bên trái (trên điện thoại ở trên), tiêu đề và mô tả bên cạnh. */
function FeaturedPost({ post }: { post: PostCardData }) {
  return (
    <Link
      href={`/tin-tuc/${post.slug}`}
      className="group grid overflow-hidden rounded-xl border bg-background transition-shadow hover:shadow-md md:grid-cols-2"
    >
      {post.cover_path ? (
        <PostImage
          path={post.cover_path}
          sizes="(min-width: 768px) 50vw, 100vw"
          className="aspect-[16/9] md:aspect-auto md:min-h-64"
        />
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center bg-muted text-muted-foreground md:aspect-auto">
          <Newspaper className="size-10" />
        </div>
      )}
      <div className="flex flex-col justify-center gap-2 p-4 md:p-6">
        <span className="text-xs font-semibold tracking-wide text-primary uppercase">Nổi bật</span>
        <h3 className="line-clamp-3 text-xl font-bold group-hover:text-primary md:text-2xl">{post.title}</h3>
        {post.excerpt && <p className="line-clamp-3 text-muted-foreground">{post.excerpt}</p>}
        {post.published_at && (
          <time dateTime={post.published_at} className="text-xs text-muted-foreground">
            {formatDate(post.published_at)}
          </time>
        )}
      </div>
    </Link>
  );
}

/** Khối tin tức trên trang chủ: 1 bài nổi bật + tối đa 3 bài mới nhất. */
export function NewsSection({ featured, latest }: { featured: PostCardData; latest: PostCardData[] }) {
  return (
    <div className="flex flex-col gap-4">
      <FeaturedPost post={featured} />
      {latest.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
