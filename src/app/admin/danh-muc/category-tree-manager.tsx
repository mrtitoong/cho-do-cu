"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { SortableList } from "@/components/admin/sortable-list";
import { CategoryIcon } from "@/components/category-icon";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AdminCategoryRow } from "@/lib/category-admin";
import { cn } from "@/lib/utils";
import { deleteCategory, reorderCategories, setCategoryActive } from "./actions";
import type { AdminCategoryNode } from "./data";

/** Cây danh mục chính → danh mục con: kéo thả đổi thứ tự, ẩn/hiện, sửa, xóa. */
export function CategoryTreeManager({ tree }: { tree: AdminCategoryNode[] }) {
  // Giữ bản sao để đổi thứ tự ngay khi thả (optimistic), lỗi thì quay lại bản cũ.
  const [mains, setMains] = useState(tree);
  const [prevTree, setPrevTree] = useState(tree);
  if (tree !== prevTree) {
    // Server gửi dữ liệu mới (sau revalidatePath) → lấy theo server
    setPrevTree(tree);
    setMains(tree);
  }
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<AdminCategoryRow | null>(null);

  function reorder(parentId: number | null, ids: number[], next: AdminCategoryNode[]) {
    const previous = mains;
    setMains(next);
    startTransition(async () => {
      const result = await reorderCategories(parentId, ids);
      if (result.ok) toast.success("Đã lưu thứ tự.");
      else {
        setMains(previous);
        toast.error(result.error);
      }
    });
  }

  if (mains.length === 0) {
    return <p className="rounded-lg border p-6 text-center text-muted-foreground">Chưa có danh mục nào.</p>;
  }

  return (
    <>
      <SortableList
        items={mains}
        getId={(m) => m.id}
        disabled={pending}
        className="space-y-3"
        onReorder={(next) =>
          reorder(
            null,
            next.map((m) => m.id),
            next,
          )
        }
        renderItem={(main, handle) => (
          <div className="rounded-xl border bg-background">
            <CategoryRow category={main} handle={handle} hasChildren={main.children.length > 0} onDelete={setDeleting} />
            <div className="border-t bg-muted/30 py-2 pr-2 pl-6 sm:pl-10">
              {main.children.length > 0 && (
                <SortableList
                  items={main.children}
                  getId={(s) => s.id}
                  disabled={pending}
                  className="space-y-1"
                  onReorder={(children) =>
                    reorder(
                      main.id,
                      children.map((s) => s.id),
                      mains.map((m) => (m.id === main.id ? { ...m, children } : m)),
                    )
                  }
                  renderItem={(sub, subHandle) => (
                    <CategoryRow category={sub} handle={subHandle} parentHidden={!main.is_active} onDelete={setDeleting} />
                  )}
                />
              )}
              <Button asChild variant="ghost" size="sm" className="mt-1 h-9 text-muted-foreground">
                <Link href={`/admin/danh-muc/moi?cha=${main.id}`}>
                  <Plus /> Thêm danh mục con
                </Link>
              </Button>
            </div>
          </div>
        )}
      />
      {pending && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Đang lưu…
        </p>
      )}
      <DeleteCategoryDialog category={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}

function CategoryRow({
  category,
  handle,
  hasChildren = false,
  parentHidden = false,
  onDelete,
}: {
  category: AdminCategoryRow;
  handle: React.ReactNode;
  hasChildren?: boolean;
  parentHidden?: boolean;
  onDelete: (category: AdminCategoryRow) => void;
}) {
  const [pending, startTransition] = useTransition();
  const isMain = category.parent_id === null;
  const canDelete = category.total_listings === 0 && !hasChildren;

  function toggleActive() {
    startTransition(async () => {
      const result = await setCategoryActive(category.id, !category.is_active);
      if (result.ok) toast.success(category.is_active ? `Đã ẩn "${category.name}".` : `Đã hiện "${category.name}".`);
      else toast.error(result.error);
    });
  }

  return (
    <div className={cn("flex items-center gap-2 p-2", !category.is_active && "opacity-60")}>
      {handle}
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg text-white",
          isMain ? "size-10" : "size-8 bg-muted text-foreground",
        )}
        style={isMain ? { backgroundColor: category.color ?? undefined } : undefined}
      >
        <CategoryIcon name={category.icon} className={isMain ? "size-5" : "size-4"} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link href={`/admin/danh-muc/${category.id}`} className={cn("truncate hover:underline", isMain && "font-semibold")}>
            {category.name}
          </Link>
          {!category.is_active && <Badge variant="outline">Đã ẩn</Badge>}
          {category.is_active && parentHidden && <Badge variant="outline">Ẩn theo danh mục chính</Badge>}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {category.slug} · {category.active_listings.toLocaleString("vi-VN")} tin đang bán
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="size-9"
          disabled={pending}
          onClick={toggleActive}
          aria-label={category.is_active ? `Ẩn ${category.name}` : `Hiện ${category.name}`}
          title={category.is_active ? "Ẩn (tin cũ vẫn hiển thị, không đăng tin mới được)" : "Hiện lại"}
        >
          {pending ? <Loader2 className="animate-spin" /> : category.is_active ? <Eye /> : <EyeOff />}
        </Button>
        <Button asChild variant="ghost" size="icon" className="size-9" aria-label={`Sửa ${category.name}`} title="Sửa">
          <Link href={`/admin/danh-muc/${category.id}`}>
            <Pencil />
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-9 text-destructive hover:text-destructive"
          disabled={!canDelete}
          onClick={() => onDelete(category)}
          aria-label={`Xóa ${category.name}`}
          title={
            canDelete
              ? "Xóa"
              : hasChildren
                ? "Đang có danh mục con, không xóa được"
                : "Đang có tin đăng, chỉ ẩn được"
          }
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

function DeleteCategoryDialog({ category, onClose }: { category: AdminCategoryRow | null; onClose: () => void }) {
  const [pending, startTransition] = useTransition();

  function confirm(e: React.MouseEvent) {
    e.preventDefault();
    if (!category) return;
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (result.ok) {
        toast.success(`Đã xóa "${category.name}".`);
        onClose();
      } else toast.error(result.error);
    });
  }

  return (
    <AlertDialog open={category !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa danh mục &quot;{category?.name}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>
            Danh mục chưa có tin nào nên có thể xóa hẳn. Thao tác này không hoàn tác được.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={confirm}>
            {pending && <Loader2 className="animate-spin" />}
            Xóa
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
