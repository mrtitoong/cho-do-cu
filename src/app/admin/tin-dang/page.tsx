import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { LISTING_STATUS_OPTIONS } from "@/components/admin/badges";
import { Pagination } from "@/components/admin/pagination";
import { PageTitle } from "@/components/layout/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { ADMIN_PAGE_SIZE, adminErrorMessage, param, parsePage, requireAdminPage } from "@/lib/admin";
import { getCategoryTree } from "@/lib/categories";
import { ListingsTable } from "./listings-table";

export const metadata: Metadata = { title: "Tin đăng" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminListingsPage({ searchParams }: PageProps<"/admin/tin-dang">) {
  const { supabase } = await requireAdminPage("/admin/tin-dang");
  const sp = await searchParams;
  const q = param(sp.q);
  const categoryId = Number(param(sp.danh_muc)) || undefined;
  const status = LISTING_STATUS_OPTIONS.find((s) => s.value === param(sp.trang_thai))?.value;
  const seller = param(sp.nguoi_dang);
  const sellerId = UUID_RE.test(param(sp.nguoi_dang_id) ?? "") ? param(sp.nguoi_dang_id) : undefined;
  const from = DATE_RE.test(param(sp.tu) ?? "") ? param(sp.tu) : undefined;
  const to = DATE_RE.test(param(sp.den) ?? "") ? param(sp.den) : undefined;
  const page = parsePage(sp.trang);

  const [{ data, error }, categories] = await Promise.all([
    supabase.rpc("admin_list_listings", {
      p_search: q,
      p_category_id: categoryId,
      p_status: status,
      p_seller: seller,
      p_seller_id: sellerId,
      p_from: from,
      p_to: to,
      p_limit: ADMIN_PAGE_SIZE,
      p_offset: (page - 1) * ADMIN_PAGE_SIZE,
    }),
    getCategoryTree(),
  ]);
  if (error) console.error("AdminListingsPage:", error);
  const rows = data ?? [];
  const total = rows[0]?.total_count ?? 0;
  const filtered = Boolean(q || categoryId || status || seller || sellerId || from || to);

  return (
    <div className="space-y-4">
      <PageTitle title="Tin đăng" description="Xem mọi tin trên nền tảng, gỡ tin vi phạm hoặc khôi phục tin đã gỡ." />

      <form className="grid gap-3 rounded-xl border bg-background p-3 sm:grid-cols-2 xl:grid-cols-4" action="/admin/tin-dang">
        {sellerId && <input type="hidden" name="nguoi_dang_id" value={sellerId} />}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="f-q">Tiêu đề</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="f-q" name="q" type="search" defaultValue={q} placeholder="Tìm theo tiêu đề" className="h-10 pl-9" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-cat">Danh mục</Label>
          <NativeSelect id="f-cat" name="danh_muc" defaultValue={categoryId ? String(categoryId) : ""} className="w-full [&_select]:h-10">
            <NativeSelectOption value="">Mọi danh mục</NativeSelectOption>
            {categories.map((m) => (
              <NativeSelectOptGroup key={m.id} label={m.name}>
                <NativeSelectOption value={String(m.id)}>Tất cả {m.name.toLowerCase()}</NativeSelectOption>
                {m.subcategories.map((s) => (
                  <NativeSelectOption key={s.id} value={String(s.id)}>
                    {s.name}
                  </NativeSelectOption>
                ))}
              </NativeSelectOptGroup>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-status">Trạng thái</Label>
          <NativeSelect id="f-status" name="trang_thai" defaultValue={status ?? ""} className="w-full [&_select]:h-10">
            <NativeSelectOption value="">Mọi trạng thái</NativeSelectOption>
            {LISTING_STATUS_OPTIONS.map((s) => (
              <NativeSelectOption key={s.value} value={s.value}>
                {s.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="f-seller">Người đăng</Label>
          <Input id="f-seller" name="nguoi_dang" defaultValue={seller} placeholder="Tên hoặc email" className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-from">Từ ngày</Label>
          <Input id="f-from" name="tu" type="date" defaultValue={from} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="f-to">Đến ngày</Label>
          <Input id="f-to" name="den" type="date" defaultValue={to} className="h-10" />
        </div>
        <div className="flex gap-2 sm:col-span-2 xl:col-span-4">
          <Button type="submit" className="h-10">
            Lọc
          </Button>
          {filtered && (
            <Button asChild variant="ghost" className="h-10">
              <Link href="/admin/tin-dang">Xóa lọc</Link>
            </Button>
          )}
        </div>
      </form>

      {error ? (
        <p className="rounded-lg border border-destructive/50 bg-background p-4 text-sm text-destructive">
          {adminErrorMessage(error, "Không tải được danh sách tin, vui lòng tải lại trang.")}
        </p>
      ) : (
        <>
          <ListingsTable rows={rows} />
          <Pagination
            basePath="/admin/tin-dang"
            params={{
              q,
              danh_muc: categoryId ? String(categoryId) : undefined,
              trang_thai: status,
              nguoi_dang: seller,
              nguoi_dang_id: sellerId,
              tu: from,
              den: to,
            }}
            page={page}
            pageSize={ADMIN_PAGE_SIZE}
            total={total}
          />
        </>
      )}
    </div>
  );
}
