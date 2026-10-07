"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, ImageIcon, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { removeListing, restoreListing } from "@/app/admin/actions";
import { ListingStatusBadge } from "@/components/admin/badges";
import { DataTable, type AdminColumnDef } from "@/components/admin/data-table";
import { ReasonDialog } from "@/components/admin/reason-dialog";
import { ListingImage } from "@/components/listing-image";
import { Button } from "@/components/ui/button";
import { displayName, type AdminListingRow } from "@/lib/admin-shared";
import type { PriceUnit } from "@/lib/category-tree";
import { formatDateTime } from "@/lib/format";
import { formatListingPrice } from "@/lib/listing-schema";

function RowActions({ row, onRemove }: { row: AdminListingRow; onRemove: (row: AdminListingRow) => void }) {
  const [pending, startTransition] = useTransition();

  if (row.status === "removed") {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await restoreListing(row.id);
            if (result.ok) toast.success("Đã khôi phục tin");
            else toast.error(result.error);
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : <RotateCcw />} Khôi phục
      </Button>
    );
  }
  return (
    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => onRemove(row)}>
      <Trash2 /> Gỡ tin
    </Button>
  );
}

type Props = {
  rows: AdminListingRow[];
  /** Ẩn cột người đăng (trang chi tiết người dùng) */
  hideSeller?: boolean;
};

export function ListingsTable({ rows, hideSeller }: Props) {
  const [removing, setRemoving] = useState<AdminListingRow | null>(null);

  const columns: AdminColumnDef<AdminListingRow>[] = [
    {
      id: "listing",
      header: "Tin đăng",
      cell: ({ row: { original: l } }) => (
        <div className="flex min-w-64 items-center gap-3">
          {l.cover_image_path ? (
            <ListingImage path={l.cover_image_path} sizes="48px" className="size-12 shrink-0 rounded-md" />
          ) : (
            <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <ImageIcon className="size-4" />
            </div>
          )}
          <div className="min-w-0">
            <a
              href={`/tin/${l.id}`}
              target="_blank"
              rel="noreferrer"
              className="line-clamp-2 font-medium break-words hover:underline"
            >
              {l.title} <ExternalLink className="inline size-3 text-muted-foreground" />
            </a>
            <p className="truncate text-xs text-muted-foreground">
              {[l.main_category_name, l.category_name].filter(Boolean).join(" › ")}
              {l.province ? ` · ${l.province}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    ...(hideSeller
      ? []
      : [
          {
            id: "seller",
            header: "Người đăng",
            cell: ({ row: { original: l } }) => (
              <Link href={`/admin/nguoi-dung/${l.seller_id}`} className="block max-w-48 hover:underline">
                <span className="block truncate">{displayName({ full_name: l.seller_name, email: l.seller_email })}</span>
                {l.seller_is_banned && <span className="text-xs text-destructive">Đang bị khóa</span>}
              </Link>
            ),
          } satisfies AdminColumnDef<AdminListingRow>,
        ]),
    {
      id: "price",
      header: "Giá",
      cell: ({ row: { original: l } }) => (
        <span className="whitespace-nowrap">{formatListingPrice(l.price, l.price_unit as PriceUnit, { short: true })}</span>
      ),
    },
    {
      id: "status",
      header: "Trạng thái",
      cell: ({ row: { original: l } }) => (
        <div className="max-w-56 space-y-1">
          <ListingStatusBadge status={l.status} />
          {l.status === "removed" && l.removed_reason && (
            <p className="line-clamp-2 text-xs text-muted-foreground" title={l.removed_reason}>
              Lý do: {l.removed_reason}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Ngày đăng",
      cell: ({ getValue }) => <span className="whitespace-nowrap">{formatDateTime(getValue<string>())}</span>,
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Thao tác</span>,
      cell: ({ row: { original: l } }) => <RowActions row={l} onRemove={setRemoving} />,
    },
  ];

  return (
    <>
      <DataTable columns={columns} data={rows} getRowId={(r) => r.id} emptyText="Không có tin nào khớp bộ lọc." />
      <ReasonDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Gỡ tin này?"
        description={
          <>
            Tin <strong>{removing?.title}</strong> sẽ bị ẩn khỏi trang web. Chủ tin vẫn thấy tin kèm lý do và không
            tự hiển thị lại được.
          </>
        }
        placeholder="VD: Tin rao bán hàng cấm, nội dung lừa đảo..."
        confirmLabel="Gỡ tin"
        successMessage="Đã gỡ tin"
        onConfirm={(reason) => removeListing(removing!.id, reason)}
      />
    </>
  );
}
