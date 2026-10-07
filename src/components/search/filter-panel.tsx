"use client";

import { useState, useSyncExternalStore } from "react";
import { NumberInput } from "@/components/number-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { findMainCategory, getFilterFields, type CategoryTree, type FieldDef } from "@/lib/category-tree";
import { formatNumber, parseDigits } from "@/lib/format";
import {
  clearFilters,
  RADIUS_OPTIONS,
  SORT_OPTIONS,
  withCategory,
  type AttrFilter,
  type SearchFilters,
} from "@/lib/search-params";
import { cn } from "@/lib/utils";

type Props = {
  categories: CategoryTree;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: SearchFilters;
  onApply: (filters: SearchFilters) => void;
};

const DESKTOP_QUERY = "(min-width: 768px)";

function useIsDesktop() {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(DESKTOP_QUERY);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

/** Bộ lọc: panel bên trái trên máy tính, bảng trượt từ dưới lên trên điện thoại. */
export function FilterPanel({ categories, open, onOpenChange, filters, onApply }: Props) {
  const isDesktop = useIsDesktop();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "left" : "bottom"}
        className={cn("gap-0 p-0", isDesktop ? "w-full sm:max-w-md" : "max-h-[90dvh] rounded-t-2xl")}
      >
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-base">Bộ lọc</SheetTitle>
          <SheetDescription className="sr-only">Lọc tin theo từ khóa, danh mục, giá và vị trí</SheetDescription>
        </SheetHeader>
        {/* Form mount lại mỗi lần mở → bản nháp luôn bắt đầu từ bộ lọc hiện tại */}
        <FilterForm
          categories={categories}
          initial={filters}
          onApply={(next) => {
            onApply(next);
            onOpenChange(false);
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function FilterForm({
  categories,
  initial,
  onApply,
}: {
  categories: CategoryTree;
  initial: SearchFilters;
  onApply: (filters: SearchFilters) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const main = findMainCategory(categories, draft.main);
  const attrFields = getFilterFields(categories, draft.main, draft.sub);
  const priceLabel = main?.priceLabel === "Mức lương" ? "Mức lương (đ/tháng)" : "Khoảng giá (đ)";

  const update = (patch: Partial<SearchFilters>) => setDraft((d) => ({ ...d, ...patch }));
  const setAttr = (key: string, value: AttrFilter | undefined) =>
    setDraft((d) => {
      const attrs = { ...d.attrs };
      if (value) attrs[key] = value;
      else delete attrs[key];
      return { ...d, attrs };
    });

  function apply() {
    let { minPrice, maxPrice } = draft;
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];
    onApply({ ...draft, q: draft.q.trim(), minPrice, maxPrice });
  }

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="filter-q">Từ khóa</Label>
          <Input
            id="filter-q"
            type="search"
            className="h-11"
            placeholder="VD: iPhone, Vision, phòng trọ..."
            value={draft.q}
            maxLength={100}
            onChange={(e) => update({ q: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="filter-main">Danh mục</Label>
            <NativeSelect
              id="filter-main"
              className="w-full [&_select]:h-11"
              value={draft.main ?? ""}
              onChange={(e) => setDraft((d) => withCategory(categories, d, e.target.value || undefined))}
            >
              <NativeSelectOption value="">Tất cả</NativeSelectOption>
              {categories.map((m) => (
                <NativeSelectOption key={m.slug} value={m.slug}>
                  {m.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-sub">Loại</Label>
            <NativeSelect
              id="filter-sub"
              className="w-full [&_select]:h-11"
              value={draft.sub ?? ""}
              disabled={!main}
              onChange={(e) => setDraft((d) => withCategory(categories, d, d.main, e.target.value || undefined))}
            >
              <NativeSelectOption value="">Tất cả</NativeSelectOption>
              {main?.subcategories.map((s) => (
                <NativeSelectOption key={s.slug} value={s.slug}>
                  {s.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        </div>

        <MinMax
          id="filter-price"
          label={priceLabel}
          min={draft.minPrice}
          max={draft.maxPrice}
          onChange={(minPrice, maxPrice) => update({ minPrice, maxPrice })}
        />

        <ChipGroup
          label="Bán kính"
          options={RADIUS_OPTIONS.map((r) => ({ value: String(r), label: `${r} km` }))}
          selected={[String(draft.radius)]}
          onToggle={(v) => update({ radius: Number(v) })}
        />

        <ChipGroup
          label="Sắp xếp"
          options={SORT_OPTIONS}
          selected={[draft.sort]}
          onToggle={(v) => update({ sort: v as SearchFilters["sort"] })}
        />

        {attrFields.length > 0 && (
          <div className="space-y-5 border-t pt-5">
            {attrFields.map((field) => (
              <AttrFilterInput
                key={field.key}
                field={field}
                value={draft.attrs[field.key]}
                onChange={(v) => setAttr(field.key, v)}
              />
            ))}
          </div>
        )}
      </div>

      <SheetFooter className="flex-row gap-2 border-t px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button type="button" variant="outline" className="h-11 flex-1" onClick={() => setDraft(clearFilters(draft))}>
          Xóa lọc
        </Button>
        <Button type="submit" className="h-11 flex-1">
          Áp dụng
        </Button>
      </SheetFooter>
    </form>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(o.value)}
              className={cn(
                "h-11 rounded-full border px-4 text-sm transition-colors",
                active ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function MinMax({
  id,
  label,
  min,
  max,
  year,
  onChange,
}: {
  id: string;
  label: string;
  min: number | undefined;
  max: number | undefined;
  year?: boolean;
  onChange: (min: number | undefined, max: number | undefined) => void;
}) {
  const input = (value: number | undefined, set: (n: number | undefined) => void, placeholder: string, idSuffix: string) =>
    year ? (
      <Input
        id={`${id}-${idSuffix}`}
        inputMode="numeric"
        maxLength={4}
        className="h-11"
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => set(parseDigits(e.target.value))}
      />
    ) : (
      <NumberInput
        id={`${id}-${idSuffix}`}
        className="h-11"
        placeholder={placeholder}
        value={value === undefined ? "" : formatNumber(value)}
        onChange={(text) => set(parseDigits(text))}
      />
    );

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{label}</legend>
      <div className="flex items-center gap-2">
        {input(min, (n) => onChange(n, max), "Từ", "min")}
        <span className="text-muted-foreground">–</span>
        {input(max, (n) => onChange(min, n), "Đến", "max")}
      </div>
    </fieldset>
  );
}

/** Bộ lọc riêng tự sinh từ trường filterable của danh mục: select → chọn nhiều, số / năm → khoảng từ – đến. */
function AttrFilterInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: AttrFilter | undefined;
  onChange: (value: AttrFilter | undefined) => void;
}) {
  if (field.type === "select") {
    const selected = value && "values" in value ? value.values : [];
    return (
      <ChipGroup
        label={field.label}
        options={field.options ?? []}
        selected={selected}
        onToggle={(v) => {
          const values = selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v];
          onChange(values.length ? { values } : undefined);
        }}
      />
    );
  }

  const range = value && !("values" in value) ? value : {};
  return (
    <MinMax
      id={`filter-${field.key}`}
      label={field.unit ? `${field.label} (${field.unit})` : field.label}
      min={range.min}
      max={range.max}
      year={field.type === "year"}
      onChange={(min, max) => onChange(min === undefined && max === undefined ? undefined : { min, max })}
    />
  );
}
