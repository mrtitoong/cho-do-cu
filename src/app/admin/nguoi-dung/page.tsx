import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Pagination } from "@/components/admin/pagination";
import { PageTitle } from "@/components/layout/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ADMIN_PAGE_SIZE, adminErrorMessage, param, parsePage, requireAdminPage } from "@/lib/admin";
import { UsersTable } from "./users-table";

export const metadata: Metadata = { title: "Người dùng" };

const ROLES = ["user", "admin"];
const STATUSES = ["active", "banned"];

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/nguoi-dung">) {
  const { supabase } = await requireAdminPage("/admin/nguoi-dung");
  const sp = await searchParams;
  const q = param(sp.q);
  const role = ROLES.find((r) => r === param(sp.vai_tro));
  const status = STATUSES.find((s) => s === param(sp.trang_thai));
  const page = parsePage(sp.trang);

  const { data, error } = await supabase.rpc("admin_list_users", {
    p_search: q,
    p_role: role,
    p_status: status,
    p_limit: ADMIN_PAGE_SIZE,
    p_offset: (page - 1) * ADMIN_PAGE_SIZE,
  });
  if (error) console.error("AdminUsersPage:", error);
  const rows = data ?? [];
  const total = rows[0]?.total_count ?? 0;

  return (
    <div className="space-y-4">
      <PageTitle title="Người dùng" description="Tìm, khóa / mở khóa tài khoản và phân quyền quản trị." />

      {/* Form GET: bộ lọc nằm trên URL, đổi bộ lọc thì về trang 1 */}
      <form className="flex flex-wrap items-end gap-2 rounded-xl border bg-background p-3" action="/admin/nguoi-dung">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Tên, email hoặc số điện thoại"
            aria-label="Tìm người dùng"
            className="h-10 pl-9"
          />
        </div>
        <NativeSelect name="vai_tro" defaultValue={role ?? ""} aria-label="Vai trò" className="[&_select]:h-10">
          <NativeSelectOption value="">Mọi vai trò</NativeSelectOption>
          <NativeSelectOption value="user">Người dùng</NativeSelectOption>
          <NativeSelectOption value="admin">Admin</NativeSelectOption>
        </NativeSelect>
        <NativeSelect name="trang_thai" defaultValue={status ?? ""} aria-label="Trạng thái" className="[&_select]:h-10">
          <NativeSelectOption value="">Mọi trạng thái</NativeSelectOption>
          <NativeSelectOption value="active">Hoạt động</NativeSelectOption>
          <NativeSelectOption value="banned">Bị khóa</NativeSelectOption>
        </NativeSelect>
        <Button type="submit" className="h-10">
          Lọc
        </Button>
        {(q || role || status) && (
          <Button asChild variant="ghost" className="h-10">
            <Link href="/admin/nguoi-dung">Xóa lọc</Link>
          </Button>
        )}
      </form>

      {error ? (
        <p className="rounded-lg border border-destructive/50 bg-background p-4 text-sm text-destructive">
          {adminErrorMessage(error, "Không tải được danh sách người dùng, vui lòng tải lại trang.")}
        </p>
      ) : (
        <>
          <UsersTable rows={rows} />
          <Pagination
            basePath="/admin/nguoi-dung"
            params={{ q, vai_tro: role, trang_thai: status }}
            page={page}
            pageSize={ADMIN_PAGE_SIZE}
            total={total}
          />
        </>
      )}
    </div>
  );
}
