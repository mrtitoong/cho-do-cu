"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  categoryInputSchema,
  DEFAULT_PIN_COLOR,
  isHideStub,
  readFields,
  type AdminCategoryRow,
  type CategoryInput,
} from "@/lib/category-admin";
import type { FieldDef, PriceLabel } from "@/lib/category-tree";
import { saveCategory } from "./actions";
import { BasicInfo, type BasicValues } from "./basic-info";
import { toFieldDef, type DraftField } from "./field-card";
import { FieldsEditor } from "./fields-editor";
import { FormPreview, previewSubCategory } from "./form-preview";
import type { AdminCategoryNode } from "./data";

type Props = {
  /** Danh mục đang sửa; không có = thêm mới */
  category?: AdminCategoryRow;
  /** Danh mục cha khi thêm danh mục con (?cha=) hoặc của danh mục đang sửa; null = danh mục chính */
  parentId: number | null;
  mains: AdminCategoryNode[];
};

function toDrafts(category: AdminCategoryRow | undefined): DraftField[] {
  return readFields(category?.fields)
    .filter((f) => !isHideStub(f))
    .map((f) => ({
      ...f,
      uid: `saved-${f.key}`,
      saved: true,
      hasData: category?.used_keys.includes(f.key) ?? false,
      savedOptions: f.options?.map((o) => o.value) ?? [],
    }));
}

/** Trường của danh mục cha đang hiện ở form (danh mục con kế thừa). */
function visibleFields(raw: unknown): FieldDef[] {
  return readFields(raw).filter((f) => !f.hidden && f.label && f.type);
}

export function CategoryForm({ category, parentId, mains }: Props) {
  const router = useRouter();
  const isMain = parentId === null;
  const [basic, setBasic] = useState<BasicValues>(() => ({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    slugTouched: Boolean(category),
    icon: category?.icon ?? "package",
    isActive: category?.is_active ?? true,
    color: category?.color ?? DEFAULT_PIN_COLOR,
    priceLabel: (category?.price_label as PriceLabel | null) ?? "Giá bán",
    requiresImages: category?.requires_images ?? true,
    parentId,
  }));
  const [fields, setFields] = useState(() => toDrafts(category));
  const [hiddenInherited, setHiddenInherited] = useState(() =>
    readFields(category?.fields).filter(isHideStub).map((f) => f.key),
  );
  const [confirmMove, setConfirmMove] = useState(false);
  const [pending, startTransition] = useTransition();

  const parent = isMain ? undefined : mains.find((m) => m.id === basic.parentId);
  const inherited = useMemo(() => (parent ? visibleFields(parent.fields) : undefined), [parent]);
  const moved = Boolean(category) && !isMain && basic.parentId !== category?.parent_id;

  // fields gửi lên: trường riêng + {key, hidden: true} cho trường kế thừa bị tắt (bỏ nếu đã ghi đè)
  const fieldDefs = useMemo(() => {
    const own = fields.map(toFieldDef);
    const inheritedKeys = inherited?.map((f) => f.key) ?? [];
    const stubs = hiddenInherited
      .filter((k) => inheritedKeys.includes(k) && !own.some((f) => f.key === k))
      .map((key): FieldDef => ({ key, hidden: true }) as FieldDef);
    return [...own, ...stubs];
  }, [fields, hiddenInherited, inherited]);

  const previewSub = useMemo(() => {
    const draft = { slug: basic.slug, name: basic.name, icon: basic.icon, sort_order: 0 };
    if (isMain) {
      return previewSubCategory(
        { ...draft, color: basic.color, price_label: basic.priceLabel, requires_images: basic.requiresImages, fields: fieldDefs },
        null,
      );
    }
    if (!parent) return undefined;
    return previewSubCategory(parent, {
      ...draft,
      color: null,
      price_label: category?.price_label ?? null,
      requires_images: category?.requires_images ?? null,
      fields: fieldDefs,
    });
  }, [basic, category, fieldDefs, isMain, parent]);

  function buildInput(): CategoryInput {
    return {
      parentId: isMain ? null : basic.parentId,
      name: basic.name,
      slug: basic.slug,
      icon: basic.icon,
      isActive: basic.isActive,
      fields: fieldDefs,
      ...(isMain ? { color: basic.color, priceLabel: basic.priceLabel, requiresImages: basic.requiresImages } : {}),
    };
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const input = buildInput();
    const parsed = categoryInputSchema.safeParse(input);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (moved && !confirmMove) {
      setConfirmMove(true);
      return;
    }
    startTransition(async () => {
      const result = await saveCategory(input, category?.id);
      setConfirmMove(false);
      if (result.ok) {
        toast.success(category ? "Đã lưu danh mục." : "Đã thêm danh mục.");
        router.push("/admin/danh-muc");
      } else toast.error(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin {isMain ? "danh mục chính" : "danh mục con"}</CardTitle>
          </CardHeader>
          <CardContent>
            <BasicInfo values={basic} onChange={setBasic} isMain={isMain} isNew={!category} mains={mains} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trường riêng</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldsEditor
              fields={fields}
              onChange={setFields}
              inherited={inherited}
              parentName={parent?.name}
              hiddenInherited={hiddenInherited}
              onHiddenInheritedChange={setHiddenInherited}
            />
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <Button asChild type="button" variant="outline" className="h-10">
            <Link href="/admin/danh-muc">Hủy</Link>
          </Button>
          <Button type="submit" className="h-10" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />}
            {category ? "Lưu thay đổi" : "Thêm danh mục"}
          </Button>
        </div>
      </div>

      <Card className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
        <CardHeader>
          <CardTitle>Xem trước form đăng tin</CardTitle>
        </CardHeader>
        <CardContent>
          <FormPreview
            sub={previewSub}
            note={isMain ? "Chưa gồm trường riêng của từng danh mục con." : undefined}
          />
        </CardContent>
      </Card>

      <AlertDialog open={confirmMove} onOpenChange={(open) => !pending && setConfirmMove(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Chuyển &quot;{basic.name}&quot; sang &quot;{parent?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              {category?.total_listings
                ? `${category.total_listings.toLocaleString("vi-VN")} tin trong danh mục này sẽ chuyển theo. `
                : "Danh mục này chưa có tin nào. "}
              Trường kế thừa sẽ lấy theo danh mục chính mới; dữ liệu cũ của tin vẫn được giữ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              {pending && <Loader2 className="animate-spin" />}
              Chuyển và lưu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
