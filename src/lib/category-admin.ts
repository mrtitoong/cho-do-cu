import { z } from "zod";
import type { FieldDef, FieldType, PriceLabel } from "@/lib/category-tree";
import type { Database } from "@/types/database";

/*
 * Kiểu, schema và hàm thuần cho trang quản lý danh mục (/admin/danh-muc).
 * Dùng được cả ở server (Server Action kiểm tra lại) lẫn trình duyệt (form).
 * Hàm SQL admin_save_category vẫn kiểm tra lại lần cuối.
 */

export type AdminCategoryRow = Database["public"]["Functions"]["admin_list_categories"]["Returns"][number];

export const PRICE_LABEL_OPTIONS = ["Giá bán", "Giá thuê/tháng", "Mức lương"] as const satisfies readonly PriceLabel[];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Văn bản",
  number: "Số",
  select: "Lựa chọn",
  range: "Khoảng số",
  year: "Năm",
};

export const DEFAULT_PIN_COLOR = "#2563eb";

/** Bỏ dấu tiếng Việt, chữ thường, chỉ giữ chữ và số, nối bằng `separator`. */
export function slugify(text: string, separator: "-" | "_" = "-") {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^\\${separator}+|\\${separator}+$`, "g"), "")
    .slice(0, 60);
}

/** Key trường sinh từ nhãn: "Số phòng ngủ" → "so_phong_ngu" (bắt đầu bằng chữ). */
export function fieldKeyFromLabel(label: string) {
  const key = slugify(label, "_").slice(0, 40);
  return /^[a-z]/.test(key) ? key : key ? `f_${key}`.slice(0, 40) : "";
}

/** Phần tử {key, hidden: true} không có nhãn: chỉ để ẩn trường kế thừa ở danh mục con. */
export function isHideStub(field: FieldDef) {
  return Boolean(field.hidden) && !field.label;
}

const KEY_RE = /^[a-z][a-z0-9_]{0,39}$/;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const optionSchema = z.object({
  value: z.string().trim().min(1, "Giá trị lựa chọn không được để trống.").max(60),
  label: z.string().trim().min(1, "Lựa chọn không được để trống.").max(60, "Lựa chọn tối đa 60 ký tự."),
});

/** Một trường riêng. looseObject để giữ các thuộc tính nâng cao (rentValue, asPrice, min, max...). */
export const fieldDefSchema = z
  .looseObject({
    key: z.string().regex(KEY_RE, "Key chỉ gồm chữ thường không dấu, số, gạch dưới và bắt đầu bằng chữ."),
    label: z.string().trim().max(60, "Nhãn tối đa 60 ký tự.").optional(),
    type: z.enum(["text", "number", "select", "range", "year"]).optional(),
    unit: z.string().trim().max(20, "Đơn vị tối đa 20 ký tự.").optional(),
    options: z.array(optionSchema).max(100).optional(),
    required: z.boolean().optional(),
    filterable: z.boolean().optional(),
    hidden: z.boolean().optional(),
  })
  .superRefine((f, ctx) => {
    if (f.hidden && !f.label) return; // {key, hidden: true}
    if (!f.label) ctx.addIssue({ code: "custom", path: ["label"], message: `Trường "${f.key}" chưa có nhãn.` });
    if (!f.type) ctx.addIssue({ code: "custom", path: ["type"], message: `Trường "${f.label ?? f.key}" chưa chọn kiểu.` });
    if (f.type === "select") {
      const values = (f.options ?? []).map((o) => o.value);
      if (values.length === 0) {
        ctx.addIssue({ code: "custom", path: ["options"], message: `Trường "${f.label}" cần ít nhất 1 lựa chọn.` });
      } else if (new Set(values).size !== values.length) {
        ctx.addIssue({ code: "custom", path: ["options"], message: `Trường "${f.label}" có lựa chọn bị trùng.` });
      }
    }
  });

export const categoryInputSchema = z
  .object({
    parentId: z.number().int().positive().nullable(),
    name: z.string().trim().min(1, "Vui lòng nhập tên danh mục.").max(60, "Tên tối đa 60 ký tự."),
    slug: z.string().trim().max(60, "Slug tối đa 60 ký tự.").regex(SLUG_RE, "Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang."),
    icon: z.string().regex(SLUG_RE, "Vui lòng chọn icon."),
    isActive: z.boolean(),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Màu ghim không hợp lệ.").optional(),
    priceLabel: z.enum(PRICE_LABEL_OPTIONS).optional(),
    requiresImages: z.boolean().optional(),
    fields: z.array(fieldDefSchema).max(40, "Mỗi danh mục tối đa 40 trường."),
  })
  .superRefine((c, ctx) => {
    const keys = c.fields.map((f) => f.key);
    const dup = keys.find((k, i) => keys.indexOf(k) !== i);
    if (dup) ctx.addIssue({ code: "custom", path: ["fields"], message: `Key trường "${dup}" bị trùng.` });
    if (c.parentId === null) {
      if (!c.color) ctx.addIssue({ code: "custom", path: ["color"], message: "Vui lòng chọn màu ghim." });
      if (!c.priceLabel) ctx.addIssue({ code: "custom", path: ["priceLabel"], message: "Vui lòng chọn nhãn giá." });
      if (c.requiresImages === undefined) {
        ctx.addIssue({ code: "custom", path: ["requiresImages"], message: "Chưa chọn có bắt buộc ảnh hay không." });
      }
    }
  });

export type CategoryInput = z.input<typeof categoryInputSchema>;

/** Đọc cột fields (jsonb) thành danh sách trường, GIỮ cả trường ẩn (khác parseFields khi dựng cây). */
export function readFields(raw: unknown): FieldDef[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (f): f is FieldDef => Boolean(f) && typeof f === "object" && typeof (f as FieldDef).key === "string",
  );
}
