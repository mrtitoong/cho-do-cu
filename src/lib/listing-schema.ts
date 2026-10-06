import { z } from "zod";
import {
  getSubCategory,
  resolvePricing,
  type CategoryField,
  type PriceUnit,
  type SubCategory,
} from "@/config/categories";
import { formatNumber, formatPrice, formatPriceShort, parseDigits } from "@/lib/format";

/*
 * Schema kiểm tra tin đăng, sinh tự động từ src/config/categories.ts.
 * Dùng chung cho form (trình duyệt) và Server Action createListing (server).
 */

export const TITLE_MIN = 10;
export const TITLE_MAX = 70;
export const DESCRIPTION_MIN = 20;
export const DESCRIPTION_MAX = 5000;
const TEXT_MAX = 100;
const PRICE_MAX = 100_000_000_000_000; // 100 nghìn tỷ

/** Giá trị thô trong form: mọi ô đều là chuỗi người dùng gõ; schema tự chuyển kiểu. */
export type RangeInput = { min: string; max: string };
export type ListingFormValues = {
  title: string;
  description: string;
  negotiable: boolean;
  price: string;
  attributes: Record<string, string | RangeInput>;
};

export type RangeValue = { min?: number; max?: number };
export type AttributeValue = string | number | RangeValue;

export function emptyAttributes(sub: SubCategory): ListingFormValues["attributes"] {
  return Object.fromEntries(sub.fields.map((f) => [f.key, f.type === "range" ? { min: "", max: "" } : ""]));
}

const lower = (label: string) => label.charAt(0).toLowerCase() + label.slice(1);

function toNumber(field: CategoryField) {
  return (v: unknown) => {
    if (typeof v !== "string") return v;
    const text = v.trim();
    if (!text) return undefined;
    if (field.decimal) return Number(text.replace(",", "."));
    return parseDigits(text);
  };
}

function numberSchema(field: CategoryField) {
  const label = field.label;
  let n = z.number({
    error: (iss) => (iss.input === undefined ? `Vui lòng nhập ${lower(label)}` : `${label} phải là số`),
  });
  if (!field.decimal || field.type === "year") n = n.int(`${label} phải là số nguyên`);
  if (field.type === "year" && field.min !== undefined && field.max !== undefined) {
    const msg = `${label} phải từ ${field.min} đến ${field.max}`;
    return n.min(field.min, msg).max(field.max, msg);
  }
  if (field.min !== undefined) n = n.min(field.min, `${label} tối thiểu là ${formatNumber(field.min)}`);
  if (field.max !== undefined) n = n.max(field.max, `${label} tối đa là ${formatNumber(field.max)}`);
  return n;
}

function fieldSchema(field: CategoryField) {
  const optional = <T extends z.ZodType>(s: T) => (field.required ? s : s.optional());
  const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

  switch (field.type) {
    case "text":
      return z.preprocess(
        blankToUndefined,
        optional(
          z
            .string({ error: `Vui lòng nhập ${lower(field.label)}` })
            .trim()
            .max(TEXT_MAX, `${field.label} tối đa ${TEXT_MAX} ký tự`),
        ),
      );
    case "select": {
      const values = (field.options ?? []).map((o) => o.value) as [string, ...string[]];
      return z.preprocess(blankToUndefined, optional(z.enum(values, { error: `Vui lòng chọn ${lower(field.label)}` })));
    }
    case "number":
    case "year":
      return z.preprocess(toNumber(field), optional(numberSchema(field)));
    case "range": {
      const parse = toNumber(field);
      return z.preprocess(
        (v) => {
          if (!v || typeof v !== "object") return blankToUndefined(v);
          const { min, max } = v as Record<string, unknown>;
          const range = { min: parse(min), max: parse(max) };
          return range.min === undefined && range.max === undefined ? undefined : range;
        },
        optional(
          z
            .object({ min: numberSchema(field).optional(), max: numberSchema(field).optional() })
            .refine((r) => r.min === undefined || r.max === undefined || r.min <= r.max, {
              message: "Mức trên phải lớn hơn hoặc bằng mức dưới",
            }),
        ),
      );
    }
  }
}

/** Sinh schema zod cho toàn bộ form đăng tin của một danh mục con. */
export function buildZodSchema(categorySlug: string) {
  const sub = getSubCategory(categorySlug);
  if (!sub) throw new Error(`Danh mục không tồn tại: ${categorySlug}`);

  const attributes = z.object(Object.fromEntries(sub.fields.map((f) => [f.key, fieldSchema(f)])));

  return z
    .object({
      title: z
        .string()
        .trim()
        .min(TITLE_MIN, `Tiêu đề cần ít nhất ${TITLE_MIN} ký tự`)
        .max(TITLE_MAX, `Tiêu đề tối đa ${TITLE_MAX} ký tự`),
      description: z
        .string()
        .trim()
        .min(DESCRIPTION_MIN, `Mô tả cần ít nhất ${DESCRIPTION_MIN} ký tự`)
        .max(DESCRIPTION_MAX, `Mô tả tối đa ${formatNumber(DESCRIPTION_MAX)} ký tự`),
      negotiable: z.boolean(),
      price: z.preprocess(
        (v) => (typeof v === "string" ? parseDigits(v) : v),
        z.number().int().min(0).max(PRICE_MAX, "Giá quá lớn").optional(),
      ),
      // z.object bỏ các key không khai báo → trường của danh mục cũ không lọt vào attributes
      attributes,
    })
    .superRefine(
      (v, ctx) => {
        if (v.negotiable) return;
        const attrs = (v.attributes ?? {}) as Record<string, unknown>;
        if (sub.priceFromField) {
          const range = attrs[sub.priceFromField] as RangeValue | undefined;
          if (range?.min === undefined) {
            ctx.addIssue({
              code: "custom",
              path: ["attributes", sub.priceFromField],
              message: "Nhập mức lương tối thiểu hoặc chọn \"Lương thỏa thuận\"",
            });
          }
        } else if (v.price === undefined) {
          const { label } = resolvePricing(sub, attrs);
          ctx.addIssue({
            code: "custom",
            path: ["price"],
            message: `Vui lòng nhập ${lower(label)} hoặc chọn "Giá thỏa thuận"`,
          });
        }
      },
      // chạy cả khi trường khác đang lỗi, để hiện đủ lỗi một lượt
      { when: () => true },
    );
}

export type ParsedListing = z.output<ReturnType<typeof buildZodSchema>>;

/** Dữ liệu đã kiểm tra → các cột của bảng listings. */
export function toListingRow(sub: SubCategory, data: ParsedListing) {
  const attributes = Object.fromEntries(
    Object.entries(data.attributes).filter(([, value]) => value !== undefined),
  ) as Record<string, AttributeValue>;
  const { unit } = resolvePricing(sub, attributes);

  let price: number | null = data.negotiable ? null : (data.price ?? null);
  if (sub.priceFromField) {
    const range = attributes[sub.priceFromField] as RangeValue | undefined;
    if (data.negotiable) delete attributes[sub.priceFromField];
    else price = range?.min ?? null; // lương tối thiểu dùng làm giá để lọc/sắp xếp
  }

  return {
    title: data.title,
    description: data.description,
    price,
    price_unit: unit,
    attributes,
  };
}

// ---------------------------------------------------------------------------
// Hiển thị
// ---------------------------------------------------------------------------

/** "1.500.000 đ", "5 triệu/tháng", "Thỏa thuận" */
export function formatListingPrice(price: number | null, unit: PriceUnit, options: { short?: boolean } = {}) {
  if (price === null) return "Thỏa thuận";
  const text = options.short ? formatPriceShort(price) : formatPrice(price);
  return unit === "month" ? `${text}/tháng` : text;
}

/** Giá trị một trường riêng để hiển thị; null nếu trống. */
export function formatAttributeValue(field: CategoryField, value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  const withUnit = (text: string) => (field.unit ? `${text} ${field.unit}` : text);

  switch (field.type) {
    case "select":
      return field.options?.find((o) => o.value === value)?.label ?? String(value);
    case "number":
      return typeof value === "number" ? withUnit(formatNumber(value)) : null;
    case "year":
      return String(value);
    case "range": {
      const { min, max } = value as RangeValue;
      if (min !== undefined && max !== undefined) return withUnit(`${formatNumber(min)} – ${formatNumber(max)}`);
      if (min !== undefined) return withUnit(`Từ ${formatNumber(min)}`);
      if (max !== undefined) return withUnit(`Đến ${formatNumber(max)}`);
      return null;
    }
    default:
      return String(value);
  }
}

/** Danh sách { label, value } của các trường riêng đã điền, theo thứ tự trong config. */
export function describeAttributes(sub: SubCategory, attributes: Record<string, unknown>) {
  return sub.fields.flatMap((field) => {
    const value = formatAttributeValue(field, attributes[field.key]);
    return value === null ? [] : [{ key: field.key, label: field.label, value }];
  });
}
