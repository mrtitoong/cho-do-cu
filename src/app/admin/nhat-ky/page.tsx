import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/admin/pagination";
import { PageTitle } from "@/components/layout/page-title";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { param, parsePage, requireAdminPage } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Nhật ký" };

const PAGE_SIZE = 50;

const ACTION_LABEL: Record<string, string> = {
  "user.ban": "Khóa tài khoản",
  "user.unban": "Mở khóa tài khoản",
  "user.grant_admin": "Cấp quyền admin",
  "user.revoke_admin": "Thu quyền admin",
  "listing.remove": "Gỡ tin",
  "listing.restore": "Khôi phục tin",
  "category.create": "Thêm danh mục",
  "category.update": "Sửa danh mục",
  "category.move": "Chuyển danh mục cha",
  "category.hide": "Ẩn danh mục",
  "category.show": "Hiện danh mục",
  "category.delete": "Xóa danh mục",
  "category.reorder": "Đổi thứ tự danh mục",
  "post.create": "Tạo bài nháp",
  "post.update": "Sửa bài viết",
  "post.publish": "Đăng bài",
  "post.unpublish": "Gỡ bài",
  "post.delete": "Xóa bài viết",
};

const TARGET_TYPES = [
  { value: "user", label: "Người dùng" },
  { value: "listing", label: "Tin đăng" },
  { value: "category", label: "Danh mục" },
  { value: "post", label: "Tin tức" },
];

const STATUS_LABEL: Record<string, string> = {
  active: "đang hiển thị",
  sold: "đã bán",
  hidden: "đã ẩn",
  removed: "đã gỡ",
};

function targetHref(type: string | null, id: string | null) {
  if (!id) return null;
  if (type === "user") return `/admin/nguoi-dung/${id}`;
  if (type === "listing") return `/tin/${id}`;
  if (type === "category") return `/admin/danh-muc/${id}`;
  if (type === "post") return `/admin/tin-tuc/${id}`;
  return null;
}

/** Tóm tắt cột detail (jsonb) thành 1 dòng dễ đọc. */
function describe(detail: unknown) {
  const d = (detail ?? {}) as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof d.name === "string" && d.name) parts.push(d.name);
  if (typeof d.is_active === "boolean") parts.push(d.is_active ? "Bật" : "Ẩn");
  if (typeof d.is_featured === "boolean") parts.push(d.is_featured ? "Đặt nổi bật" : "Bỏ nổi bật");
  if (typeof d.listings === "number") parts.push(`${d.listings} tin chuyển theo`);
  if (typeof d.reason === "string" && d.reason) parts.push(`Lý do: ${d.reason}`);
  if (typeof d.hidden_listings === "number") parts.push(`Ẩn ${d.hidden_listings} tin`);
  if (typeof d.from === "string" && typeof d.to === "string") {
    parts.push(`${STATUS_LABEL[d.from] ?? d.from} → ${STATUS_LABEL[d.to] ?? d.to}`);
  }
  return parts.join(" · ");
}

export default async function AdminLogsPage({ searchParams }: PageProps<"/admin/nhat-ky">) {
  const { supabase } = await requireAdminPage("/admin/nhat-ky");
  const sp = await searchParams;
  const type = TARGET_TYPES.find((t) => t.value === param(sp.loai))?.value;
  const page = parsePage(sp.trang);

  let query = supabase
    .from("admin_logs")
    .select("id, action, target_type, target_id, detail, created_at, admin:profiles(id, full_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (type) query = query.eq("target_type", type);
  const { data, count, error } = await query;
  if (error) console.error("AdminLogsPage:", error);

  return (
    <div className="space-y-4">
      <PageTitle title="Nhật ký" description="Mọi thao tác thay đổi của quản trị viên, mới nhất trước." />

      <form className="flex flex-wrap items-center gap-2 rounded-xl border bg-background p-3" action="/admin/nhat-ky">
        <NativeSelect name="loai" defaultValue={type ?? ""} aria-label="Loại đối tượng" className="[&_select]:h-10">
          <NativeSelectOption value="">Mọi loại</NativeSelectOption>
          {TARGET_TYPES.map((t) => (
            <NativeSelectOption key={t.value} value={t.value}>
              {t.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="submit" className="h-10">
          Lọc
        </Button>
        {type && (
          <Button asChild variant="ghost" className="h-10">
            <Link href="/admin/nhat-ky">Xóa lọc</Link>
          </Button>
        )}
      </form>

      {error ? (
        <p className="rounded-lg border border-destructive/50 bg-background p-4 text-sm text-destructive">
          Không tải được nhật ký, vui lòng tải lại trang.
        </p>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Quản trị viên</TableHead>
                  <TableHead>Thao tác</TableHead>
                  <TableHead>Đối tượng</TableHead>
                  <TableHead>Chi tiết</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!data?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Chưa có thao tác nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((log) => {
                    const href = targetHref(log.target_type, log.target_id);
                    const typeLabel = TARGET_TYPES.find((t) => t.value === log.target_type)?.label ?? log.target_type;
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">{formatDateTime(log.created_at)}</TableCell>
                        <TableCell>
                          {log.admin ? (
                            <Link href={`/admin/nguoi-dung/${log.admin.id}`} className="hover:underline">
                              {log.admin.full_name?.trim() || "Admin"}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-medium">
                          {ACTION_LABEL[log.action] ?? log.action}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {href ? (
                            <Link href={href} className="hover:underline">
                              {typeLabel} #{log.target_id?.slice(0, 8)}
                            </Link>
                          ) : (
                            [typeLabel, log.target_id].filter(Boolean).join(" #")
                          )}
                        </TableCell>
                        <TableCell className="max-w-96 whitespace-normal text-muted-foreground">
                          {describe(log.detail)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination basePath="/admin/nhat-ky" params={{ loai: type }} page={page} pageSize={PAGE_SIZE} total={count ?? 0} />
        </>
      )}
    </div>
  );
}
