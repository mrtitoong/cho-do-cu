import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import type { Database } from "@/types/database";
import {
  buildCategoryTree,
  findSubCategoryById,
  type CategoryRow,
  type CategoryTree,
  type FieldDef,
} from "@/lib/category-tree";

/*
 * Đọc danh mục và trường riêng từ bảng categories (chỉ dùng ở server).
 * Danh mục KHÔNG viết cứng trong code: Admin thêm/sửa/ẩn trong DB, xong gọi
 * revalidateTag(CATEGORIES_TAG) để xóa cache.
 */

export * from "@/lib/category-tree";
export { buildZodSchema } from "@/lib/listing-schema";

export const CATEGORIES_TAG = "categories";

/**
 * Các dòng categories đang bật. Dùng client không cookie (quyền anon) vì unstable_cache
 * không được đọc cookie; danh mục là dữ liệu công khai nên kết quả giống nhau với mọi người.
 */
const getActiveCategoryRows = unstable_cache(
  async (): Promise<CategoryRow[]> => {
    const supabase = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await supabase
      .from("categories")
      .select("id, parent_id, slug, name, icon, color, sort_order, price_label, requires_images, fields")
      .eq("is_active", true);
    // Ném lỗi để unstable_cache không lưu kết quả rỗng
    if (error) throw new Error(`Không tải được danh mục: ${error.message}`);
    return data;
  },
  ["categories:active"],
  { tags: [CATEGORIES_TAG], revalidate: 3600 },
);

/** Cây danh mục chính → danh mục con (chỉ danh mục đang bật), theo sort_order. */
export async function getCategoryTree(): Promise<CategoryTree> {
  // Dựng cây ngoài cache để giá trị phụ thuộc thời gian (năm sản xuất tối đa) luôn mới.
  return buildCategoryTree(await getActiveCategoryRows());
}

/** Trường riêng của một danh mục con (đã gộp với danh mục cha). Danh mục không tồn tại → []. */
export async function getFieldsForCategory(subCategoryId: number): Promise<FieldDef[]> {
  return findSubCategoryById(await getCategoryTree(), subCategoryId)?.fields ?? [];
}
