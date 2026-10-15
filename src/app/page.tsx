import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Map as MapIcon, PackageOpen } from "lucide-react";
import { CategoryGrid } from "@/components/home/category-grid";
import { HeroSearch } from "@/components/home/hero-search";
import { LatestListings } from "@/components/home/latest-listings";
import { NewsSection } from "@/components/home/news-section";
import { PlatformStats } from "@/components/home/platform-stats";
import { SiteFooter } from "@/components/home/site-footer";
import { Button } from "@/components/ui/button";
import { getCategoryTree } from "@/lib/categories";
import { getHomePosts, getLatestListings, getPublicStats } from "@/lib/home-data";

// Số liệu, tin mới, tin tức cache 10 phút (HOME_REVALIDATE_SECONDS trong lib/home-data).
export const revalidate = 600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** Lỗi tải dữ liệu thì ẩn khối đó, không làm hỏng cả trang chủ. */
async function safe<T>(label: string, load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (e) {
    console.error(`Trang chủ – ${label}:`, e);
    return null;
  }
}

function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function HomePage() {
  const [categories, stats, latest, posts] = await Promise.all([
    getCategoryTree(),
    safe("thống kê", getPublicStats),
    safe("tin mới", getLatestListings),
    safe("tin tức", getHomePosts),
  ]);

  const counts = stats && Object.fromEntries(stats.active_by_category.map((c) => [c.category_id, c.count]));
  const mains = Object.fromEntries(categories.map((m) => [m.id, { color: m.color, icon: m.icon }]));

  return (
    <>
      <div className="bg-gradient-to-b from-primary/15 to-background px-4 pt-10 pb-8 sm:pt-16 sm:pb-12">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 text-center">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Mua bán quanh bạn, xem ngay trên bản đồ</h1>
            <p className="text-muted-foreground sm:text-lg">
              Đồ cũ, xe cộ, nhà đất, việc làm gần nơi bạn ở. Đăng tin miễn phí, liên hệ trực tiếp người bán.
            </p>
          </div>
          <HeroSearch categories={categories.map(({ slug, name }) => ({ slug, name }))} />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:gap-14">
        <Section title="Danh mục">
          <CategoryGrid categories={categories} counts={counts} />
        </Section>

        {stats && <PlatformStats stats={stats} />}

        <Section
          title="Tin đăng mới"
          action={
            <Button asChild variant="outline" className="h-11">
              <Link href="/tim-kiem?sx=newest">
                <MapIcon /> <span className="hidden sm:inline">Xem trên bản đồ</span>
                <span className="sm:hidden">Bản đồ</span>
              </Link>
            </Button>
          }
        >
          {latest === null ? (
            <p className="rounded-lg border border-destructive/50 p-4 text-sm text-destructive">
              Không tải được tin mới, vui lòng tải lại trang.
            </p>
          ) : latest.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center text-muted-foreground">
              <PackageOpen className="size-8" />
              <p>Chưa có tin đăng nào. Hãy là người đầu tiên!</p>
              <Button asChild className="h-11">
                <Link href="/dang-tin">Đăng tin ngay</Link>
              </Button>
            </div>
          ) : (
            <LatestListings initial={latest} mains={mains} />
          )}
        </Section>

        {posts?.featured && (
          <Section
            title="Tin tức"
            action={
              <Link href="/tin-tuc" className="flex min-h-11 items-center gap-1 text-sm font-medium text-primary">
                Xem tất cả <ArrowRight className="size-4" />
              </Link>
            }
          >
            <NewsSection featured={posts.featured} latest={posts.latest} />
          </Section>
        )}
      </div>

      <SiteFooter />
    </>
  );
}
