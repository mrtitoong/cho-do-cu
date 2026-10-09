import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Pagination } from "@/components/admin/pagination";
import { PageTitle } from "@/components/layout/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ADMIN_PAGE_SIZE, param, parsePage, requireAdminPage } from "@/lib/admin";
import { POST_STATUS_LABEL, type PostStatus } from "@/lib/posts";
import { PostsTable } from "./posts-table";

export const metadata: Metadata = { title: "Tin tức" };

const STATUS_OPTIONS = Object.entries(POST_STATUS_LABEL).map(([value, label]) => ({
  value: value as PostStatus,
  label,
}));

/** Thoát ký tự đặc biệt của ILIKE để tìm đúng chuỗi người dùng gõ. */
const escapeLike = (text: string) => text.replace(/[\\%_]/g, (c) => `\\${c}`);

export default async function AdminPostsPage({ searchParams }: PageProps<"/admin/tin-tuc">) {
  const { supabase } = await requireAdminPage("/admin/tin-tuc");
  const sp = await searchParams;
  const q = param(sp.q);
  const status = STATUS_OPTIONS.find((s) => s.value === param(sp.trang_thai))?.value;
  const featured = param(sp.noi_bat) === "1" ? "1" : undefined;
  const page = parsePage(sp.trang);

  let query = supabase
    .from("posts")
    .select("id, slug, title, cover_path, status, is_featured, published_at, updated_at", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * ADMIN_PAGE_SIZE, page * ADMIN_PAGE_SIZE - 1);
  if (q) query = query.ilike("title", `%${escapeLike(q)}%`);
  if (status) query = query.eq("status", status);
  if (featured) query = query.eq("is_featured", true);
  const { data, count, error } = await query;
  if (error) console.error("AdminPostsPage:", error);
  const filtered = Boolean(q || status || featured);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageTitle title="Tin tức" description="Soạn, đăng và gỡ bài viết hiển thị ở trang Tin tức và trang chủ." />
        <Button asChild className="h-10">
          <Link href="/admin/tin-tuc/moi">
            <Plus /> Viết bài mới
          </Link>
        </Button>
      </div>

      <form
        className="grid gap-3 rounded-xl border bg-background p-3 sm:grid-cols-2 xl:grid-cols-4"
        action="/admin/tin-tuc"
      >
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="f-q">Tiêu đề</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="f-q"
              name="q"
              type="search"
              defaultValue={q}
              placeholder="Tìm theo tiêu đề"
              className="h-10 pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-status">Trạng thái</Label>
          <NativeSelect id="f-status" name="trang_thai" defaultValue={status ?? ""} className="w-full [&_select]:h-10">
            <NativeSelectOption value="">Mọi trạng thái</NativeSelectOption>
            {STATUS_OPTIONS.map((s) => (
              <NativeSelectOption key={s.value} value={s.value}>
                {s.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-featured">Nổi bật</Label>
          <NativeSelect id="f-featured" name="noi_bat" defaultValue={featured ?? ""} className="w-full [&_select]:h-10">
            <NativeSelectOption value="">Tất cả</NativeSelectOption>
            <NativeSelectOption value="1">Chỉ bài nổi bật</NativeSelectOption>
          </NativeSelect>
        </div>
        <div className="flex gap-2 sm:col-span-2 xl:col-span-4">
          <Button type="submit" className="h-10">
            Lọc
          </Button>
          {filtered && (
            <Button asChild variant="ghost" className="h-10">
              <Link href="/admin/tin-tuc">Xóa lọc</Link>
            </Button>
          )}
        </div>
      </form>

      {error ? (
        <p className="rounded-lg border border-destructive/50 bg-background p-4 text-sm text-destructive">
          Không tải được danh sách bài viết, vui lòng tải lại trang.
        </p>
      ) : (
        <>
          <PostsTable rows={data ?? []} />
          <Pagination
            basePath="/admin/tin-tuc"
            params={{ q, trang_thai: status, noi_bat: featured }}
            page={page}
            pageSize={ADMIN_PAGE_SIZE}
            total={count ?? 0}
          />
        </>
      )}
    </div>
  );
}
