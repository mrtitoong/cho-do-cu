/*
 * Cây danh mục và trường riêng, dựng từ bảng categories (xem supabase/migrations/0005_admin_news_stats.sql).
 * File này chỉ gồm kiểu và hàm thuần nên dùng được cả ở server lẫn trình duyệt;
 * hàm đọc DB nằm ở src/lib/categories.ts.
 */

export type FieldType = "text" | "number" | "select" | "range" | "year";

export type FieldOption = { value: string; label: string };

/** Một trường riêng của danh mục (một phần tử trong cột categories.fields). */
export type FieldDef = {
  /** Khóa lưu trong listings.attributes */
  key: string;
  label: string;
  type: FieldType;
  /** Đơn vị hiển thị sau giá trị: m², km, tháng, đ/tháng... */
  unit?: string;
  /** Bắt buộc với type 'select' */
  options?: FieldOption[];
  required?: boolean;
  /** Có xuất hiện trong bộ lọc tìm kiếm không */
  filterable?: boolean;
  placeholder?: string;
  /** Cho phép số thập phân (mặc định chỉ số nguyên), áp dụng cho 'number' */
  decimal?: boolean;
  /** Giới hạn cho 'number' / 'range' / 'year' ('year' không khai max thì mặc định năm hiện tại + 1) */
  min?: number;
  max?: number;
  /** (select) Chọn giá trị này thì tin là "cho thuê": nhãn "Giá thuê/tháng", price_unit 'month' */
  rentValue?: string;
  /** (range) Mức dưới của khoảng dùng làm giá tin thay cho ô giá chung (VD mức lương Việc làm) */
  asPrice?: boolean;
  /** Ẩn khỏi form (dữ liệu cũ vẫn giữ); ở danh mục con dùng để bỏ trường kế thừa từ danh mục cha */
  hidden?: boolean;
};

export type PriceLabel = "Giá bán" | "Giá thuê/tháng" | "Mức lương";
export type PriceUnit = "total" | "month";

/** Một dòng bảng categories (các cột cần dùng). */
export type CategoryRow = {
  id: number;
  parent_id: number | null;
  slug: string;
  name: string;
  icon: string;
  color: string | null;
  sort_order: number;
  price_label: string | null;
  requires_images: boolean | null;
  fields: unknown;
};

export type SubCategory = {
  id: number;
  slug: string;
  name: string;
  /** Tên icon lucide-react (kebab-case), xem src/components/category-icon.tsx */
  icon: string;
  /** Slug danh mục chính */
  parent: string;
  parentId: number;
  parentName: string;
  priceLabel: PriceLabel;
  priceUnit: PriceUnit;
  requiresImages: boolean;
  /** Trường riêng đã gộp từ danh mục cha + con, đã bỏ trường ẩn */
  fields: FieldDef[];
  /** Khi attributes[key] === value thì tin là "cho thuê" */
  rentWhen?: { key: string; value: string };
  /** Giá lấy từ trường 'range' này (mức dưới) thay cho ô giá chung */
  priceFromField?: string;
};

export type MainCategory = {
  id: number;
  slug: string;
  name: string;
  icon: string;
  /** Màu ghim trên bản đồ và chip danh mục */
  color: string;
  priceLabel: PriceLabel;
  requiresImages: boolean;
  subcategories: SubCategory[];
};

export type CategoryTree = MainCategory[];

const PRICE_LABELS: PriceLabel[] = ["Giá bán", "Giá thuê/tháng", "Mức lương"];
const DEFAULT_COLOR = "#64748b";

function toPriceLabel(value: string | null | undefined): PriceLabel | undefined {
  return PRICE_LABELS.find((l) => l === value);
}

/** Nhãn "Giá thuê/tháng" và "Mức lương" là giá theo tháng. */
export function priceUnitOf(label: PriceLabel): PriceUnit {
  return label === "Giá bán" ? "total" : "month";
}

/** Đọc cột fields (jsonb) thành danh sách trường, bỏ phần tử sai định dạng. */
function parseFields(raw: unknown): FieldDef[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (f): f is FieldDef => Boolean(f) && typeof f === "object" && typeof (f as FieldDef).key === "string",
  );
}

/**
 * Gộp trường của danh mục cha và con: lấy danh sách của cha, trường con trùng key thay thế
 * trường của cha tại chỗ, trường con có key mới thêm vào cuối; cuối cùng bỏ trường hidden.
 */
export function mergeFields(parentFields: FieldDef[], ownFields: FieldDef[]): FieldDef[] {
  const merged = parentFields.map((p) => ownFields.find((o) => o.key === p.key) ?? p);
  for (const own of ownFields) if (!parentFields.some((p) => p.key === own.key)) merged.push(own);

  const nextYear = new Date().getFullYear() + 1;
  return merged
    .filter((f) => !f.hidden && f.label && f.type)
    .map((f) => (f.type === "year" && f.max === undefined ? { ...f, max: nextYear } : f));
}

/** Dựng cây danh mục chính → danh mục con từ các dòng bảng categories. */
export function buildCategoryTree(rows: CategoryRow[]): CategoryTree {
  const byOrder = (a: CategoryRow, b: CategoryRow) => a.sort_order - b.sort_order || a.id - b.id;

  return rows
    .filter((r) => r.parent_id === null)
    .sort(byOrder)
    .map((m) => {
      const priceLabel = toPriceLabel(m.price_label) ?? "Giá bán";
      const requiresImages = m.requires_images ?? true;
      const mainFields = parseFields(m.fields);

      const subcategories = rows
        .filter((r) => r.parent_id === m.id)
        .sort(byOrder)
        .map((s): SubCategory => {
          const fields = mergeFields(mainFields, parseFields(s.fields));
          const subLabel = toPriceLabel(s.price_label) ?? priceLabel;
          const rent = fields.find((f) => f.type === "select" && f.rentValue);
          const salary = fields.find((f) => f.type === "range" && f.asPrice);
          return {
            id: s.id,
            slug: s.slug,
            name: s.name,
            icon: s.icon,
            parent: m.slug,
            parentId: m.id,
            parentName: m.name,
            priceLabel: subLabel,
            priceUnit: priceUnitOf(subLabel),
            requiresImages: s.requires_images ?? requiresImages,
            fields,
            rentWhen: rent ? { key: rent.key, value: rent.rentValue! } : undefined,
            priceFromField: salary?.key,
          };
        });

      return {
        id: m.id,
        slug: m.slug,
        name: m.name,
        icon: m.icon,
        color: m.color ?? DEFAULT_COLOR,
        priceLabel,
        requiresImages,
        subcategories,
      };
    });
}

export function findMainCategory(tree: CategoryTree, slug: string | null | undefined): MainCategory | undefined {
  return slug ? tree.find((m) => m.slug === slug) : undefined;
}

export function findSubCategory(tree: CategoryTree, slug: string | null | undefined): SubCategory | undefined {
  if (!slug) return undefined;
  for (const m of tree) {
    const sub = m.subcategories.find((s) => s.slug === slug);
    if (sub) return sub;
  }
  return undefined;
}

export function findSubCategoryById(tree: CategoryTree, id: number | null | undefined): SubCategory | undefined {
  if (id === null || id === undefined) return undefined;
  for (const m of tree) {
    const sub = m.subcategories.find((s) => s.id === id);
    if (sub) return sub;
  }
  return undefined;
}

/** id danh mục chính → danh mục chính (để tô màu ghim, ảnh thay thế theo parent_category_id). */
export function mainCategoryById(tree: CategoryTree): Record<number, MainCategory> {
  return Object.fromEntries(tree.map((m) => [m.id, m]));
}

/**
 * Các trường dùng làm bộ lọc riêng: của danh mục con nếu đã chọn, nếu chỉ chọn danh mục chính thì
 * gộp các trường filterable của mọi danh mục con (trùng key thì gộp options, VD hãng xe máy + ô tô).
 */
export function getFilterFields(tree: CategoryTree, mainSlug?: string, subSlug?: string): FieldDef[] {
  const sub = findSubCategory(tree, subSlug);
  if (sub) return sub.fields.filter((f) => f.filterable);

  const main = findMainCategory(tree, mainSlug);
  if (!main) return [];

  const byKey = new Map<string, FieldDef>();
  for (const field of main.subcategories.flatMap((s) => s.fields)) {
    if (!field.filterable) continue;
    const existing = byKey.get(field.key);
    if (!existing) {
      byKey.set(field.key, field);
    } else if (existing.type === "select" && field.type === "select") {
      const options = [...(existing.options ?? [])];
      for (const o of field.options ?? []) if (!options.some((x) => x.value === o.value)) options.push(o);
      // "Khác" luôn để cuối
      options.sort((a, b) => Number(a.value === "khac") - Number(b.value === "khac"));
      byKey.set(field.key, { ...existing, options });
    }
  }
  return [...byKey.values()];
}

/** Nhãn giá và price_unit thực tế, phụ thuộc vào trường "Hình thức" (Bán / Cho thuê). */
export function resolvePricing(
  sub: Pick<SubCategory, "rentWhen" | "priceLabel" | "priceUnit">,
  attributes: Record<string, unknown> = {},
): { label: PriceLabel; unit: PriceUnit } {
  if (sub.rentWhen && attributes[sub.rentWhen.key] === sub.rentWhen.value) {
    return { label: "Giá thuê/tháng", unit: "month" };
  }
  return { label: sub.priceLabel, unit: sub.priceUnit };
}
