"use client";

import Link from "next/link";
import { RoleBadge, UserStatusBadge } from "@/components/admin/badges";
import { DataTable, type AdminColumnDef } from "@/components/admin/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { displayName, type AdminUserRow } from "@/lib/admin-shared";
import { formatDate, formatNumber, formatTimeAgo } from "@/lib/format";

const columns: AdminColumnDef<AdminUserRow>[] = [
  {
    id: "user",
    header: "Người dùng",
    cell: ({ row: { original: u } }) => (
      <Link href={`/admin/nguoi-dung/${u.id}`} className="flex min-w-48 items-center gap-3 hover:underline">
        <Avatar className="size-9">
          {u.avatar_url && <AvatarImage src={u.avatar_url} alt="" />}
          <AvatarFallback>{displayName(u).charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="min-w-0">
          <span className="block truncate font-medium">{displayName(u)}</span>
          <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
        </span>
      </Link>
    ),
  },
  { accessorKey: "phone", header: "Số điện thoại", cell: ({ getValue }) => getValue<string | null>() ?? "—" },
  { accessorKey: "role", header: "Vai trò", cell: ({ getValue }) => <RoleBadge role={getValue<string>()} /> },
  {
    accessorKey: "is_banned",
    header: "Trạng thái",
    cell: ({ getValue }) => <UserStatusBadge banned={getValue<boolean>()} />,
  },
  {
    accessorKey: "active_listings",
    header: "Tin đang bán",
    cell: ({ getValue }) => <span className="tabular-nums">{formatNumber(getValue<number>())}</span>,
  },
  {
    accessorKey: "transactions",
    header: "Giao dịch",
    cell: ({ getValue }) => <span className="tabular-nums">{formatNumber(getValue<number>())}</span>,
  },
  { accessorKey: "created_at", header: "Ngày tham gia", cell: ({ getValue }) => formatDate(getValue<string>()) },
  {
    accessorKey: "last_seen_at",
    header: "Hoạt động cuối",
    cell: ({ getValue }) => {
      const v = getValue<string | null>();
      return v ? <time dateTime={v}>{formatTimeAgo(v)}</time> : "—";
    },
  },
];

export function UsersTable({ rows }: { rows: AdminUserRow[] }) {
  return <DataTable columns={columns} data={rows} getRowId={(r) => r.id} emptyText="Không có người dùng nào khớp bộ lọc." />;
}
