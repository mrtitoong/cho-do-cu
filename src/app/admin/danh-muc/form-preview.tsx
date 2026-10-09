"use client";

import { useForm } from "react-hook-form";
import { StepDetails } from "@/app/dang-tin/step-details";
import { CategoryIcon } from "@/components/category-icon";
import { buildCategoryTree, type CategoryRow, type SubCategory } from "@/lib/category-tree";
import type { ListingFormValues } from "@/lib/listing-schema";

/** Dựng danh mục con "ảo" từ bản nháp để xem trước form đăng tin đúng như người bán sẽ thấy. */
export function previewSubCategory(main: Omit<CategoryRow, "id" | "parent_id">, sub: Omit<CategoryRow, "id" | "parent_id"> | null) {
  const rows: CategoryRow[] = [
    { ...main, id: -1, parent_id: null },
    sub
      ? { ...sub, id: -2, parent_id: -1 }
      : { ...main, id: -2, parent_id: -1, name: "Danh mục con", fields: [], price_label: null, requires_images: null },
  ];
  return buildCategoryTree(rows)[0]?.subcategories[0];
}

const DEFAULT_VALUES: ListingFormValues = { title: "", description: "", negotiable: false, price: "", attributes: {} };

export function FormPreview({ sub, note }: { sub: SubCategory | undefined; note?: string }) {
  const form = useForm<ListingFormValues>({ defaultValues: DEFAULT_VALUES });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
          <CategoryIcon name={sub?.icon} className="size-4" />
        </span>
        <span className="font-medium">
          {sub ? `${sub.parentName} › ${sub.name || "(chưa đặt tên)"}` : "Danh mục"}
        </span>
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
      {sub ? (
        <div>
          <StepDetails sub={sub} form={form} />
          <p className="mt-4 text-xs text-muted-foreground">
            Ảnh: {sub.requiresImages ? "bắt buộc ít nhất 1 ảnh" : "không bắt buộc"}.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Chưa có dữ liệu để xem trước.</p>
      )}
    </div>
  );
}
