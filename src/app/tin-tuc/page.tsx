import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Newspaper } from "lucide-react";
import { PostCard } from "@/components/posts/post-card";
import { PageTitle } from "@/components/layout/page-title";
import { Button } from "@/components/ui/button";
import { parsePage } from "@/lib/admin";
import { POSTS_PAGE_SIZE } from "@/lib/posts";
import { getPublishedPosts } from "@/lib/posts-data";

export const metadata: Metadata = {
  title: "Tin tức",
  description: "Tin tức, hướng dẫn mua bán an toàn và thông báo mới từ Chợ Đồ Cũ.",
  alternates: { canonical: "/tin-tuc" },
};

const pageHref = (p: number) => (p > 1 ? `/tin-tuc?trang=${p}` : "/tin-tuc");

export default async function NewsPage({ searchParams }: PageProps<"/tin-tuc">) {
  const page = parsePage((await searchParams).trang);
  const { posts, total, error } = await getPublishedPosts(page);
  const pageCount = Math.max(1, Math.ceil(total / POSTS_PAGE_SIZE));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <PageTitle title="Tin tức" description="Tin tức, hướng dẫn và thông báo mới từ Chợ Đồ Cũ." />

      {error ? (
        <p className="rounded-lg border border-destructive/50 p-4 text-sm text-destructive">
          Không tải được tin tức, vui lòng tải lại trang.
        </p>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <Newspaper className="size-8" />
          <p>{page > 1 ? "Trang này không có bài viết nào." : "Chưa có bài viết nào."}</p>
          {page > 1 && (
            <Button asChild variant="outline">
              <Link href="/tin-tuc">Về trang đầu</Link>
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {pageCount > 1 && (
            <nav aria-label="Phân trang" className="mt-8 flex items-center justify-center gap-3 text-sm">
              {page > 1 ? (
                <Button asChild variant="outline" className="h-11">
                  <Link href={pageHref(page - 1)}>
                    <ChevronLeft /> Trước
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" className="h-11" disabled>
                  <ChevronLeft /> Trước
                </Button>
              )}
              <span className="text-muted-foreground">
                Trang {page}/{pageCount}
              </span>
              {page < pageCount ? (
                <Button asChild variant="outline" className="h-11">
                  <Link href={pageHref(page + 1)}>
                    Sau <ChevronRight />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" className="h-11" disabled>
                  Sau <ChevronRight />
                </Button>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
