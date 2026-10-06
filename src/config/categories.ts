import {
  Bike,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Camera,
  Car,
  Clock,
  CookingPot,
  Ellipsis,
  Headphones,
  House,
  LandPlot,
  Laptop,
  Motorbike,
  Package,
  Shirt,
  Smartphone,
  Sofa,
  Store,
  Tv,
  Wrench,
  BedDouble,
  type LucideIcon,
} from "lucide-react";

/*
 * Cấu hình danh mục: nguồn duy nhất cho form đăng tin, bộ lọc và trang chi tiết.
 * Slug phải khớp với bảng categories (seed trong supabase/migrations/0001_init.sql).
 * Thêm/sửa trường riêng của danh mục chỉ cần sửa file này.
 */

export type FieldType = "text" | "number" | "select" | "range" | "year";

export type FieldOption = { value: string; label: string };

export type CategoryField = {
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
  /** Cho phép số thập phân (mặc định chỉ số nguyên) – áp dụng cho 'number' */
  decimal?: boolean;
  /** Giới hạn cho 'number' / 'range' / 'year' */
  min?: number;
  max?: number;
};

export type PriceLabel = "Giá bán" | "Giá thuê/tháng" | "Mức lương";
export type PriceUnit = "total" | "month";

export type MainCategorySlug = "bat-dong-san" | "viec-lam" | "xe-co" | "do-dien-tu" | "san-pham-khac";

export type SubCategory = {
  slug: string;
  name: string;
  parent: MainCategorySlug;
  icon: LucideIcon;
  priceLabel: PriceLabel;
  priceUnit: PriceUnit;
  fields: CategoryField[];
  /** Khi attributes[key] === value thì tin là "cho thuê": nhãn "Giá thuê/tháng", price_unit 'month' */
  rentWhen?: { key: string; value: string };
  /** Giá lấy từ trường 'range' này (cận dưới) thay cho ô giá chung – dùng cho Việc làm */
  priceFromField?: string;
};

export type MainCategory = {
  slug: MainCategorySlug;
  name: string;
  icon: LucideIcon;
  /** Màu ghim trên bản đồ và chip danh mục */
  color: string;
  subcategories: SubCategory[];
};

const CURRENT_YEAR = new Date().getFullYear();

const opts = (...labels: [value: string, label: string][]): FieldOption[] =>
  labels.map(([value, label]) => ({ value, label }));

const brandOptions = (...names: string[]): FieldOption[] =>
  [...names, "Khác"].map((name) => ({
    value: name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/gi, "d")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
    label: name,
  }));

// ---------------------------------------------------------------------------
// Bất động sản
// ---------------------------------------------------------------------------
const hinhThuc: CategoryField = {
  key: "hinh_thuc",
  label: "Hình thức",
  type: "select",
  options: opts(["ban", "Bán"], ["cho_thue", "Cho thuê"]),
  required: true,
  filterable: true,
};
const dienTich: CategoryField = {
  key: "dien_tich",
  label: "Diện tích",
  type: "number",
  unit: "m²",
  decimal: true,
  min: 1,
  max: 1_000_000,
  required: true,
  filterable: true,
};
const phongNgu: CategoryField = {
  key: "so_phong_ngu",
  label: "Số phòng ngủ",
  type: "number",
  unit: "phòng",
  min: 0,
  max: 50,
  filterable: true,
};
const soWc: CategoryField = { key: "so_wc", label: "Số WC", type: "number", unit: "phòng", min: 0, max: 50 };
const giayTo: CategoryField = {
  key: "giay_to",
  label: "Giấy tờ pháp lý",
  type: "select",
  options: opts(["so_hong", "Sổ hồng"], ["so_do", "Sổ đỏ"], ["giay_tay", "Giấy tay"], ["dang_cho_so", "Đang chờ sổ"]),
  filterable: true,
};

const RENT = { key: "hinh_thuc", value: "cho_thue" };

// ---------------------------------------------------------------------------
// Việc làm
// ---------------------------------------------------------------------------
const jobFields: CategoryField[] = [
  {
    key: "luong",
    label: "Mức lương",
    type: "range",
    unit: "đ/tháng",
    min: 0,
    max: 10_000_000_000,
  },
  {
    key: "nganh_nghe",
    label: "Ngành nghề",
    type: "select",
    options: opts(
      ["ban_hang", "Bán hàng"],
      ["phuc_vu", "Phục vụ / Nhà hàng"],
      ["giao_hang", "Giao hàng / Tài xế"],
      ["kho_van", "Kho vận"],
      ["lao_dong_pho_thong", "Lao động phổ thông"],
      ["van_phong", "Văn phòng"],
      ["ky_thuat", "Kỹ thuật"],
      ["cntt", "Công nghệ thông tin"],
      ["giao_duc", "Giáo dục"],
      ["y_te", "Y tế"],
      ["khac", "Khác"],
    ),
    required: true,
    filterable: true,
  },
  {
    key: "kinh_nghiem",
    label: "Kinh nghiệm",
    type: "select",
    options: opts(
      ["khong_yeu_cau", "Không yêu cầu"],
      ["duoi_1_nam", "Dưới 1 năm"],
      ["1_3_nam", "1–3 năm"],
      ["tren_3_nam", "Trên 3 năm"],
    ),
    required: true,
    filterable: true,
  },
  { key: "ten_cong_ty", label: "Tên công ty / cửa hàng", type: "text", placeholder: "VD: Cửa hàng Minh Anh" },
];

// ---------------------------------------------------------------------------
// Xe cộ
// ---------------------------------------------------------------------------
const tinhTrangXe: CategoryField = {
  key: "tinh_trang",
  label: "Tình trạng",
  type: "select",
  options: opts(["moi", "Mới"], ["da_su_dung", "Đã sử dụng"]),
  required: true,
  filterable: true,
};

const vehicleFields = (brands: FieldOption[], options: { mileage: boolean }): CategoryField[] => [
  { key: "hang", label: "Hãng", type: "select", options: brands, required: true, filterable: true },
  { key: "dong_xe", label: "Dòng xe", type: "text", placeholder: "VD: Vision, Vios..." },
  {
    key: "nam_san_xuat",
    label: "Năm sản xuất",
    type: "year",
    min: 1950,
    max: CURRENT_YEAR + 1,
    filterable: true,
  },
  ...(options.mileage
    ? [{ key: "so_km", label: "Số km đã đi", type: "number", unit: "km", min: 0, max: 10_000_000, filterable: true } as const]
    : []),
  tinhTrangXe,
];

// ---------------------------------------------------------------------------
// Đồ điện tử
// ---------------------------------------------------------------------------
const electronicFields = (brands: FieldOption[] | null): CategoryField[] => [
  brands
    ? { key: "hang", label: "Hãng", type: "select", options: brands, required: true, filterable: true }
    : { key: "hang", label: "Hãng", type: "text", placeholder: "VD: Anker, Baseus..." },
  {
    key: "tinh_trang",
    label: "Tình trạng",
    type: "select",
    options: opts(["moi", "Mới"], ["nhu_moi", "Như mới"], ["da_su_dung", "Đã sử dụng"], ["hu_hong", "Hư hỏng"]),
    required: true,
    filterable: true,
  },
  { key: "bao_hanh", label: "Bảo hành còn lại", type: "number", unit: "tháng", min: 0, max: 120 },
];

// ---------------------------------------------------------------------------
// Sản phẩm khác
// ---------------------------------------------------------------------------
const otherFields: CategoryField[] = [
  {
    key: "tinh_trang",
    label: "Tình trạng",
    type: "select",
    options: opts(["moi", "Mới"], ["nhu_moi", "Như mới"], ["da_su_dung", "Đã sử dụng"]),
    required: true,
    filterable: true,
  },
];

// ---------------------------------------------------------------------------

type SubInput = Omit<SubCategory, "parent" | "priceLabel" | "priceUnit"> &
  Partial<Pick<SubCategory, "priceLabel" | "priceUnit">>;

const MAIN_COLORS: Record<MainCategorySlug, string> = {
  "bat-dong-san": "#16a34a",
  "viec-lam": "#7c3aed",
  "xe-co": "#2563eb",
  "do-dien-tu": "#0891b2",
  "san-pham-khac": "#d97706",
};

function main(slug: MainCategorySlug, name: string, icon: LucideIcon, subs: SubInput[]): MainCategory {
  return {
    slug,
    name,
    icon,
    color: MAIN_COLORS[slug],
    subcategories: subs.map((s) => ({ priceLabel: "Giá bán", priceUnit: "total", ...s, parent: slug })),
  };
}

export const MAIN_CATEGORIES: MainCategory[] = [
  main("bat-dong-san", "Bất động sản", House, [
    { slug: "nha-o", name: "Nhà ở", icon: House, rentWhen: RENT, fields: [hinhThuc, dienTich, phongNgu, soWc, giayTo] },
    { slug: "can-ho", name: "Căn hộ", icon: Building2, rentWhen: RENT, fields: [hinhThuc, dienTich, phongNgu, soWc, giayTo] },
    { slug: "dat", name: "Đất", icon: LandPlot, rentWhen: RENT, fields: [hinhThuc, dienTich, giayTo] },
    {
      slug: "phong-tro",
      name: "Phòng trọ",
      icon: BedDouble,
      priceLabel: "Giá thuê/tháng",
      priceUnit: "month",
      fields: [dienTich, soWc],
    },
    { slug: "mat-bang", name: "Mặt bằng", icon: Store, rentWhen: RENT, fields: [hinhThuc, dienTich, giayTo] },
  ]),
  main(
    "viec-lam",
    "Việc làm",
    BriefcaseBusiness,
    [
      { slug: "toan-thoi-gian", name: "Toàn thời gian", icon: BriefcaseBusiness },
      { slug: "ban-thoi-gian", name: "Bán thời gian", icon: Clock },
      { slug: "thoi-vu", name: "Thời vụ", icon: CalendarDays },
    ].map((s) => ({ ...s, priceLabel: "Mức lương", priceUnit: "month", priceFromField: "luong", fields: jobFields })),
  ),
  main("xe-co", "Xe cộ", Car, [
    {
      slug: "xe-may",
      name: "Xe máy",
      icon: Motorbike,
      fields: vehicleFields(brandOptions("Honda", "Yamaha", "Suzuki", "Piaggio", "SYM", "VinFast"), { mileage: true }),
    },
    {
      slug: "o-to",
      name: "Ô tô",
      icon: Car,
      fields: vehicleFields(
        brandOptions("Toyota", "Hyundai", "Kia", "Mazda", "Ford", "Honda", "Mitsubishi", "VinFast", "Mercedes-Benz", "BMW"),
        { mileage: true },
      ),
    },
    {
      slug: "xe-dap",
      name: "Xe đạp",
      icon: Bike,
      fields: vehicleFields(brandOptions("Giant", "Trinx", "Asama", "Thống Nhất", "Galaxy"), { mileage: false }),
    },
    {
      slug: "phu-tung",
      name: "Phụ tùng",
      icon: Wrench,
      fields: [{ key: "hang", label: "Dùng cho hãng xe", type: "text", placeholder: "VD: Honda" }, tinhTrangXe],
    },
  ]),
  main("do-dien-tu", "Đồ điện tử", Smartphone, [
    {
      slug: "dien-thoai",
      name: "Điện thoại",
      icon: Smartphone,
      fields: electronicFields(brandOptions("Apple", "Samsung", "Xiaomi", "OPPO", "vivo", "realme", "Nokia")),
    },
    {
      slug: "laptop",
      name: "Laptop",
      icon: Laptop,
      fields: electronicFields(brandOptions("Apple", "Dell", "HP", "Lenovo", "Asus", "Acer", "MSI")),
    },
    {
      slug: "tivi",
      name: "Tivi",
      icon: Tv,
      fields: electronicFields(brandOptions("Samsung", "LG", "Sony", "TCL", "Xiaomi", "Casper")),
    },
    {
      slug: "may-anh",
      name: "Máy ảnh",
      icon: Camera,
      fields: electronicFields(brandOptions("Canon", "Nikon", "Sony", "Fujifilm", "Panasonic")),
    },
    { slug: "phu-kien", name: "Phụ kiện", icon: Headphones, fields: electronicFields(null) },
  ]),
  main("san-pham-khac", "Sản phẩm khác", Package, [
    { slug: "noi-that", name: "Nội thất", icon: Sofa, fields: otherFields },
    { slug: "thoi-trang", name: "Thời trang", icon: Shirt, fields: otherFields },
    { slug: "do-gia-dung", name: "Đồ gia dụng", icon: CookingPot, fields: otherFields },
    { slug: "sach", name: "Sách", icon: BookOpen, fields: otherFields },
    { slug: "khac", name: "Khác", icon: Ellipsis, fields: otherFields },
  ]),
];

const SUB_BY_SLUG = new Map(MAIN_CATEGORIES.flatMap((m) => m.subcategories.map((s) => [s.slug, s] as const)));

export function getMainCategory(slug: string): MainCategory | undefined {
  return MAIN_CATEGORIES.find((m) => m.slug === slug);
}

export function getSubCategory(slug: string): SubCategory | undefined {
  return SUB_BY_SLUG.get(slug);
}

/**
 * Các trường dùng làm bộ lọc riêng: của danh mục con nếu đã chọn, nếu chỉ chọn danh mục chính thì
 * gộp các trường filterable của mọi danh mục con (trùng key thì gộp options, ví dụ hãng xe máy + ô tô).
 */
export function getFilterFields(mainSlug?: string, subSlug?: string): CategoryField[] {
  const sub = subSlug ? getSubCategory(subSlug) : undefined;
  if (sub) return sub.fields.filter((f) => f.filterable);

  const mainCat = mainSlug ? getMainCategory(mainSlug) : undefined;
  if (!mainCat) return [];

  const byKey = new Map<string, CategoryField>();
  for (const field of mainCat.subcategories.flatMap((s) => s.fields)) {
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
  sub: SubCategory,
  attributes: Record<string, unknown> = {},
): { label: PriceLabel; unit: PriceUnit } {
  if (sub.rentWhen && attributes[sub.rentWhen.key] === sub.rentWhen.value) {
    return { label: "Giá thuê/tháng", unit: "month" };
  }
  return { label: sub.priceLabel, unit: sub.priceUnit };
}
