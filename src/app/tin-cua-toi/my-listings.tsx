"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Eye, EyeOff, ImageIcon, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { ListingImage } from "@/components/listing-image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTimeAgo } from "@/lib/format";
import { deleteListing, setListingStatus, type ListingStatus } from "./actions";

export type MyListing = {
  id: string;
  title: string;
  status: ListingStatus;
  priceText: string;
  area: string;
  createdAt: string;
  coverPath: string | null;
  categoryName: string | null;
};

const TABS: { value: ListingStatus; label: string; empty: string }[] = [
  { value: "active", label: "Đang hiển thị", empty: "Bạn chưa có tin nào đang hiển thị." },
  { value: "sold", label: "Đã bán", empty: "Chưa có tin nào được đánh dấu đã bán." },
  { value: "hidden", label: "Đã ẩn", empty: "Không có tin nào đang ẩn." },
];

const STATUS_TOAST: Record<ListingStatus, string> = {
  active: "Tin đã hiển thị trở lại",
  sold: "Đã đánh dấu tin là đã bán",
  hidden: "Đã ẩn tin",
};

export function MyListings({ listings }: { listings: MyListing[] }) {
  const [tab, setTab] = useState<ListingStatus>("active");
  const [deleting, setDeleting] = useState<MyListing | null>(null);
  const visible = listings.filter((l) => l.status === tab);
  const current = TABS.find((t) => t.value === tab)!;

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as ListingStatus)}>
        <TabsList className="h-11 w-full">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="px-1 text-xs sm:text-sm">
              {t.label} ({listings.filter((l) => l.status === t.value).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          <p>{current.empty}</p>
          {tab === "active" && (
            <Button asChild className="h-11">
              <Link href="/dang-tin">
                <Plus /> Đăng tin mới
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((listing) => (
            <li key={listing.id}>
              <ListingRow listing={listing} onDelete={() => setDeleting(listing)} />
            </li>
          ))}
        </ul>
      )}

      <DeleteDialog listing={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function ListingRow({ listing, onDelete }: { listing: MyListing; onDelete: () => void }) {
  const [pending, startTransition] = useTransition();

  function changeStatus(status: ListingStatus) {
    startTransition(async () => {
      const result = await setListingStatus(listing.id, status);
      if (result.ok) toast.success(STATUS_TOAST[status]);
      else toast.error(result.error);
    });
  }

  const meta = [listing.categoryName, listing.area, `Đăng ${formatTimeAgo(listing.createdAt)}`].filter(Boolean);

  return (
    <article className="rounded-xl border p-3">
      <Link href={`/tin/${listing.id}`} className="flex gap-3 rounded-lg hover:opacity-90">
        {listing.coverPath ? (
          <ListingImage path={listing.coverPath} sizes="96px" className="size-20 shrink-0 rounded-lg sm:size-24" />
        ) : (
          <div className="flex size-20 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground sm:size-24">
            <ImageIcon className="size-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 text-sm font-medium leading-snug break-words">{listing.title}</h2>
          <p className="mt-1 font-semibold text-primary">{listing.priceText}</p>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{meta.join(" · ")}</p>
        </div>
      </Link>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 sm:flex sm:flex-wrap">
        <Button asChild variant="outline" className="h-11">
          <Link href={`/tin/${listing.id}/sua`}>
            <Pencil /> Sửa
          </Link>
        </Button>
        {listing.status === "active" && (
          <Button variant="outline" className="h-11" disabled={pending} onClick={() => changeStatus("sold")}>
            <CheckCircle2 /> Đã bán
          </Button>
        )}
        {listing.status === "hidden" ? (
          <Button variant="outline" className="h-11" disabled={pending} onClick={() => changeStatus("active")}>
            <Eye /> Hiện tin
          </Button>
        ) : (
          <Button variant="outline" className="h-11" disabled={pending} onClick={() => changeStatus("hidden")}>
            <EyeOff /> Ẩn tin
          </Button>
        )}
        <Button
          variant="outline"
          className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive sm:ml-auto"
          disabled={pending}
          onClick={onDelete}
        >
          <Trash2 /> Xóa
        </Button>
        {pending && <Loader2 className="col-span-2 mx-auto size-5 animate-spin self-center text-muted-foreground sm:col-auto" />}
      </div>
    </article>
  );
}

function DeleteDialog({ listing, onClose }: { listing: MyListing | null; onClose: () => void }) {
  const [pending, startTransition] = useTransition();

  function confirm() {
    if (!listing) return;
    startTransition(async () => {
      const result = await deleteListing(listing.id);
      if (result.ok) {
        toast.success("Đã xóa tin");
        onClose();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <AlertDialog open={Boolean(listing)} onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa tin này?</AlertDialogTitle>
          <AlertDialogDescription>
            Tin &quot;{listing?.title}&quot; cùng toàn bộ ảnh và các cuộc trò chuyện về tin sẽ bị xóa vĩnh viễn, không
            khôi phục được.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11" disabled={pending}>
            Hủy
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="h-11"
            disabled={pending}
            onClick={(e) => {
              e.preventDefault(); // giữ hộp thoại mở đến khi xóa xong
              confirm();
            }}
          >
            {pending && <Loader2 className="animate-spin" />} Xóa tin
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
