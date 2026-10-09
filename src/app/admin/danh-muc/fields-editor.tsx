"use client";

import { Plus } from "lucide-react";
import { SortableList } from "@/components/admin/sortable-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FIELD_TYPE_LABELS } from "@/lib/category-admin";
import type { FieldDef } from "@/lib/category-tree";
import { FieldCard, type DraftField } from "./field-card";

type Props = {
  fields: DraftField[];
  onChange: (fields: DraftField[]) => void;
  /** Danh mục con: các trường (đang hiện) của danh mục cha */
  inherited?: FieldDef[];
  parentName?: string;
  /** Key trường kế thừa đang bị ẩn ở danh mục con này */
  hiddenInherited: string[];
  onHiddenInheritedChange: (keys: string[]) => void;
};

let nextUid = 0;
export function newUid() {
  nextUid += 1;
  return `new-${nextUid}`;
}

/** Trình soạn trường riêng: thêm, sửa, kéo thả thứ tự; danh mục con bật/tắt trường kế thừa. */
export function FieldsEditor({ fields, onChange, inherited, parentName, hiddenInherited, onHiddenInheritedChange }: Props) {
  const parentKeys = inherited?.map((f) => f.key) ?? [];

  function addField() {
    onChange([
      ...fields,
      { uid: newUid(), key: "", label: "", type: "text", required: false, filterable: false, saved: false, hasData: false, savedOptions: [] },
    ]);
  }

  return (
    <div className="space-y-5">
      {inherited && inherited.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Kế thừa từ {parentName}</h3>
          <ul className="divide-y rounded-lg border">
            {inherited.map((f) => {
              const overridden = fields.some((own) => own.key === f.key);
              const shown = !hiddenInherited.includes(f.key);
              return (
                <li key={f.key} className="flex min-h-11 items-center gap-2 px-3 py-1.5 text-sm">
                  <span className={overridden || !shown ? "text-muted-foreground line-through" : undefined}>{f.label}</span>
                  <Badge variant="secondary">{FIELD_TYPE_LABELS[f.type]}</Badge>
                  {overridden ? (
                    <span className="ml-auto text-xs text-muted-foreground">Được thay bằng trường bên dưới</span>
                  ) : (
                    <label className="ml-auto flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={shown}
                        onCheckedChange={(v) =>
                          onHiddenInheritedChange(
                            v === true ? hiddenInherited.filter((k) => k !== f.key) : [...hiddenInherited, f.key],
                          )
                        }
                      />
                      Hiện ở danh mục này
                    </label>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="space-y-2">
        {inherited && <h3 className="text-sm font-medium">Trường riêng của danh mục con</h3>}
        {fields.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Chưa có trường riêng.</p>
        ) : (
          <SortableList
            items={fields}
            getId={(f) => f.uid}
            onReorder={onChange}
            className="space-y-2"
            renderItem={(field, handle) => (
              <FieldCard
                field={field}
                handle={handle}
                parentKeys={parentKeys}
                otherKeys={fields.filter((f) => f.uid !== field.uid).map((f) => f.key)}
                onChange={(next) => onChange(fields.map((f) => (f.uid === field.uid ? next : f)))}
                onRemove={() => onChange(fields.filter((f) => f.uid !== field.uid))}
              />
            )}
          />
        )}
        <Button type="button" variant="outline" className="h-10" onClick={addField}>
          <Plus /> Thêm trường
        </Button>
      </section>
    </div>
  );
}
