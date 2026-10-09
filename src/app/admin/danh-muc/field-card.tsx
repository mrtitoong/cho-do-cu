"use client";

import { useState } from "react";
import { ChevronDown, EyeOff, Eye, Plus, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { FIELD_TYPE_LABELS, fieldKeyFromLabel, slugify } from "@/lib/category-admin";
import type { FieldDef, FieldOption, FieldType } from "@/lib/category-tree";
import { cn } from "@/lib/utils";

/** Trường đang soạn: FieldDef + thông tin phụ chỉ dùng trên form (bỏ đi trước khi lưu). */
export type DraftField = FieldDef & {
  uid: string;
  /** Key đã lưu trong DB (không tự sinh lại key theo nhãn) */
  saved: boolean;
  /** Đã có dữ liệu trong tin → không đổi key, "xóa" thành ẩn */
  hasData: boolean;
  /** Giá trị lựa chọn đã lưu trong DB (không tự sinh lại theo nhãn) */
  savedOptions: string[];
  keyTouched?: boolean;
};

const DRAFT_ONLY_KEYS = ["uid", "saved", "hasData", "savedOptions", "keyTouched"] as const;

/** Bỏ thông tin phụ của form, các thuộc tính không dùng tới, giữ nguyên thuộc tính nâng cao (rentValue...). */
export function toFieldDef(draft: DraftField): FieldDef {
  const out: Record<string, unknown> = { ...draft };
  for (const k of DRAFT_ONLY_KEYS) delete out[k];
  if (!draft.unit?.trim()) delete out.unit;
  if (draft.type !== "select") delete out.options;
  return out as FieldDef;
}

const TYPES = Object.entries(FIELD_TYPE_LABELS) as [FieldType, string][];
const UNIT_TYPES: FieldType[] = ["number", "range", "text"];

type Props = {
  field: DraftField;
  handle: React.ReactNode;
  /** Key của trường danh mục cha (danh mục con: trùng key = ghi đè) */
  parentKeys: string[];
  /** Key của các trường khác trong danh sách (để báo trùng) */
  otherKeys: string[];
  onChange: (field: DraftField) => void;
  onRemove: () => void;
};

export function FieldCard({ field, handle, parentKeys, otherKeys, onChange, onRemove }: Props) {
  const [open, setOpen] = useState(!field.saved);
  const id = `field-${field.uid}`;
  const keyLocked = field.saved && field.hasData;
  const duplicate = field.key !== "" && otherKeys.includes(field.key);

  function update(patch: Partial<DraftField>) {
    onChange({ ...field, ...patch });
  }

  function setLabel(label: string) {
    const autoKey = !field.saved && !field.keyTouched;
    update({ label, ...(autoKey ? { key: fieldKeyFromLabel(label) } : {}) });
  }

  function setType(type: FieldType) {
    update({ type, options: type === "select" ? (field.options?.length ? field.options : [{ value: "", label: "" }]) : field.options });
  }

  return (
    <div className={cn("rounded-lg border bg-background", field.hidden && "border-dashed opacity-70")}>
      <div className="flex items-center gap-1 p-1.5">
        {handle}
        <button
          type="button"
          className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-md px-1 text-left"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={id}
        >
          <span className={cn("truncate font-medium", !field.label && "text-muted-foreground italic")}>
            {field.label || "Trường mới"}
          </span>
          <Badge variant="secondary" className="shrink-0">
            {field.type ? FIELD_TYPE_LABELS[field.type] : "?"}
          </Badge>
          {field.required && <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">Bắt buộc</Badge>}
          {field.filterable && <Badge variant="outline" className="hidden shrink-0 sm:inline-flex">Bộ lọc</Badge>}
          {field.hidden && <Badge variant="outline" className="shrink-0">Đã ẩn</Badge>}
          {parentKeys.includes(field.key) && <Badge variant="outline" className="shrink-0">Ghi đè</Badge>}
          <ChevronDown className={cn("ml-auto size-4 shrink-0 transition-transform", open && "rotate-180")} />
        </button>
        {field.hidden ? (
          <Button type="button" variant="ghost" size="icon" className="size-9" onClick={() => update({ hidden: false })} title="Hiện lại" aria-label={`Hiện lại ${field.label}`}>
            <Eye />
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 text-destructive hover:text-destructive"
            onClick={() => (field.hasData ? update({ hidden: true }) : onRemove())}
            title={field.hasData ? "Ẩn khỏi form (đã có dữ liệu nên không xóa hẳn)" : "Xóa trường"}
            aria-label={`${field.hasData ? "Ẩn" : "Xóa"} ${field.label || "trường mới"}`}
          >
            {field.hasData ? <EyeOff /> : <Trash2 />}
          </Button>
        )}
      </div>

      {open && (
        <div id={id} className="grid gap-3 border-t p-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-label`}>Nhãn</Label>
            <Input id={`${id}-label`} value={field.label ?? ""} maxLength={60} placeholder="VD: Diện tích" onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-key`}>Key</Label>
            <Input
              id={`${id}-key`}
              value={field.key}
              maxLength={40}
              disabled={keyLocked}
              className="font-mono text-sm"
              aria-invalid={duplicate}
              onChange={(e) => update({ key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""), keyTouched: true })}
            />
            <p className={cn("text-xs", duplicate ? "text-destructive" : "text-muted-foreground")}>
              {duplicate
                ? "Key bị trùng với trường khác."
                : keyLocked
                  ? "Đã có tin dùng trường này, không đổi được key."
                  : parentKeys.includes(field.key)
                    ? "Trùng key danh mục cha: trường này thay thế trường của cha."
                    : "Tự sinh từ nhãn; dùng để lưu dữ liệu tin."}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-type`}>Kiểu</Label>
            <NativeSelect id={`${id}-type`} className="w-full" value={field.type ?? ""} onChange={(e) => setType(e.target.value as FieldType)}>
              {TYPES.map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {field.hasData && <p className="text-xs text-muted-foreground">Đổi kiểu có thể làm dữ liệu cũ hiển thị sai.</p>}
          </div>
          {field.type && UNIT_TYPES.includes(field.type) && (
            <div className="space-y-1.5">
              <Label htmlFor={`${id}-unit`}>Đơn vị</Label>
              <Input id={`${id}-unit`} value={field.unit ?? ""} maxLength={20} placeholder="VD: m², km, tháng" onChange={(e) => update({ unit: e.target.value })} />
            </div>
          )}
          {field.type === "select" && (
            <OptionsEditor
              options={field.options ?? []}
              savedValues={field.savedOptions}
              onChange={(options) => update({ options })}
            />
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-2 sm:col-span-2">
            <label className="flex min-h-9 items-center gap-2 text-sm">
              <Checkbox checked={Boolean(field.required)} onCheckedChange={(v) => update({ required: v === true })} />
              Bắt buộc
            </label>
            <label className="flex min-h-9 items-center gap-2 text-sm">
              <Checkbox checked={Boolean(field.filterable)} onCheckedChange={(v) => update({ filterable: v === true })} />
              Dùng làm bộ lọc
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

/** Danh sách lựa chọn: giá trị lưu DB tự sinh từ nhãn, lựa chọn đã lưu giữ nguyên giá trị. */
function OptionsEditor({
  options,
  savedValues,
  onChange,
}: {
  options: FieldOption[];
  savedValues: string[];
  onChange: (options: FieldOption[]) => void;
}) {
  function setLabel(index: number, label: string) {
    onChange(
      options.map((o, i) => {
        if (i !== index) return o;
        const fixed = savedValues.includes(o.value);
        return { label, value: fixed ? o.value : slugify(label, "_") || `lua_chon_${i + 1}` };
      }),
    );
  }

  return (
    <fieldset className="space-y-2 sm:col-span-2">
      <legend className="mb-1.5 text-sm font-medium">Các lựa chọn</legend>
      {options.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            aria-label={`Lựa chọn ${index + 1}`}
            value={option.label}
            maxLength={60}
            placeholder={`Lựa chọn ${index + 1}`}
            onChange={(e) => setLabel(index, e.target.value)}
          />
          <code className="hidden w-32 shrink-0 truncate text-xs text-muted-foreground sm:block" title={option.value}>
            {option.value}
          </code>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            disabled={options.length <= 1}
            onClick={() => onChange(options.filter((_, i) => i !== index))}
            aria-label={`Xóa lựa chọn ${option.label || index + 1}`}
          >
            <X />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => onChange([...options, { value: "", label: "" }])}>
        <Plus /> Thêm lựa chọn
      </Button>
    </fieldset>
  );
}
