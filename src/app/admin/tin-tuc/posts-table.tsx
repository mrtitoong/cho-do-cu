"use client";

import Link from "next/link";
import { ExternalLink, Newspaper, Pencil, Star } from "lucide-react";
import { DataTable, type AdminColumnDef } from "@/components/admin/data-table";
import { PostImage } from "@/components/posts/post-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { POST_STATUS_LABEL, type PostStatus } from "@/lib/posts";

export type AdminPostRow = {
  id: string;
  slug: string;
  title: string;
  cover_path: string | null;
  status: string;
  is_featured: boolean;
  published_at: string | null;
  updated_at: string;
};

const columns: AdminColumnDef<AdminPostRow>[] = [
  {
    id: "post",
    header: "Bài viết",
    cell: ({ row: { original: p } }) => (
      <div className="flex min-w-72 items-center gap-3">
        {p.cover_path ? (
          <PostImage path={p.cover_path} sizes="80px" className="aspect-[16/9] w-20 shrink-0 rounded-md" />
        ) : (
          <div className="flex aspect-[16/9] w-20 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Newspaper className="size-4" />
          </div>
        )}
        <div className="min-w-0">
          <Link href={`/admin/tin-tuc/${p.id}`} className="line-clamp-2 font-medium break-words hover:underline">
            {p.title}
          </Link>
          <p className="truncate text-xs text-muted-foreground">/tin-tuc/{p.slug}</p>
        </div>
      </div>
    ),
  },
  {
    id: "status",
    header: "Trạng thái",
    cell: ({ row: { original: p } }) => (
      <div className="flex items-center gap-1.5">
        <Badge variant={p.status === "published" ? "default" : "outline"}>
          {POST_STATUS_LABEL[p.status as PostStatus] ?? p.status}
        </Badge>
        {p.is_featured && (
          <Badge variant="secondary">
            <Star className="fill-current" /> Nổi bật
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: "published_at",
    header: "Ngày đăng",
    cell: ({ getValue }) => {
      const v = getValue<string | null>();
      return <span className="whitespace-nowrap">{v ? formatDateTime(v) : "—"}</span>;
    },
  },
  {
    accessorKey: "updated_at",
    header: "Sửa lần cuối",
    cell: ({ getValue }) => <span className="whitespace-nowrap">{formatDateTime(getValue<string>())}</span>,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Thao tác</span>,
    cell: ({ row: { original: p } }) => (
      <div className="flex justify-end gap-2">
        {p.status === "published" && (
          <Button asChild variant="ghost" size="sm">
            <a href={`/tin-tuc/${p.slug}`} target="_blank" rel="noreferrer">
              <ExternalLink /> Xem
            </a>
          </Button>
        )}
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/tin-tuc/${p.id}`}>
            <Pencil /> Sửa
          </Link>
        </Button>
      </div>
    ),
  },
];

export function PostsTable({ rows }: { rows: AdminPostRow[] }) {
  return (
    <DataTable columns={columns} data={rows} getRowId={(r) => r.id} emptyText="Chưa có bài viết nào khớp bộ lọc." />
  );
}
