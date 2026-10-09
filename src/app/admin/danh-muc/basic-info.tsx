"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PRICE_LABEL_OPTIONS, slugify } from "@/lib/category-admin";
import type { PriceLabel } from "@/lib/category-tree";
import type { AdminCategoryNode } from "./data";
import { IconPicker } from "./icon-picker";

export type BasicValues = {
  name: string;
  slug: string;
  /** Đã sửa slug bằng tay (hoặc đang sửa danh mục có sẵn) → không tự sinh theo tên nữa */
  slugTouched: boolean;
  icon: string;
  isActive: boolean;
  color: string;
  priceLabel: PriceLabel;
  requiresImages: boolean;
  parentId: number | null;
};

type Props = {
  values: BasicValues;
  onChange: (values: BasicValues) => void;
  isMain: boolean;
  isNew: boolean;
  mains: AdminCategoryNode[];
};

/** Tên, slug, icon, bật/tắt; danh mục chính thêm màu ghim, nhãn giá, bắt buộc ảnh; danh mục con thêm danh mục cha. */
export function BasicInfo({ values, onChange, isMain, isNew, mains }: Props) {
  function update(patch: Partial<BasicValues>) {
    onChange({ ...values, ...patch });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="cat-name">
          Tên <span className="text-destructive">*</span>
        </Label>
        <Input
          id="cat-name"
          className="h-10"
          value={values.name}
          maxLength={60}
          placeholder={isMain ? "VD: Thú cưng" : "VD: Chó"}
          onChange={(e) =>
            update({ name: e.target.value, ...(values.slugTouched ? {} : { slug: slugify(e.target.value) }) })
          }
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cat-slug">
          Slug <span className="text-destructive">*</span>
        </Label>
        <Input
          id="cat-slug"
          className="h-10 font-mono text-sm"
          value={values.slug}
          maxLength={60}
          onChange={(e) => update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""), slugTouched: true })}
        />
        <p className="text-xs text-muted-foreground">
          {isNew ? "Tự sinh từ tên, bỏ dấu tiếng Việt." : "Đổi slug thì link lọc cũ theo danh mục này sẽ không còn đúng."}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cat-icon">Icon</Label>
        <div>
          <IconPicker id="cat-icon" value={values.icon} onChange={(icon) => update({ icon })} />
        </div>
      </div>

      {isMain ? (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="cat-color">Màu ghim</Label>
            <div className="flex items-center gap-2">
              <input
                id="cat-color"
                type="color"
                className="h-10 w-14 cursor-pointer rounded-md border bg-background p-1"
                value={values.color}
                onChange={(e) => update({ color: e.target.value })}
              />
              <code className="text-sm text-muted-foreground">{values.color}</code>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-price-label">Nhãn giá</Label>
            <NativeSelect
              id="cat-price-label"
              className="w-full [&_select]:h-10"
              value={values.priceLabel}
              onChange={(e) => update({ priceLabel: e.target.value as PriceLabel })}
            >
              {PRICE_LABEL_OPTIONS.map((l) => (
                <NativeSelectOption key={l} value={l}>
                  {l}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <label className="flex min-h-10 items-center gap-2 self-end text-sm">
            <Checkbox checked={values.requiresImages} onCheckedChange={(v) => update({ requiresImages: v === true })} />
            Bắt buộc có ít nhất 1 ảnh
          </label>
        </>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="cat-parent">Danh mục chính</Label>
          <NativeSelect
            id="cat-parent"
            className="w-full [&_select]:h-10"
            value={values.parentId ?? ""}
            onChange={(e) => update({ parentId: Number(e.target.value) })}
          >
            {mains.map((m) => (
              <NativeSelectOption key={m.id} value={m.id}>
                {m.name}
                {m.is_active ? "" : " (đã ẩn)"}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      )}

      <label className="flex min-h-10 items-center gap-2 text-sm sm:col-span-2">
        <Checkbox checked={values.isActive} onCheckedChange={(v) => update({ isActive: v === true })} />
        Đang bật (bỏ chọn để ẩn: tin cũ vẫn hiển thị, không đăng tin mới vào được)
      </label>
    </div>
  );
}
