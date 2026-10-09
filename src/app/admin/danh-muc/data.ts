import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminCategoryRow } from "@/lib/category-admin";
import type { Database } from "@/types/database";

export type AdminCategoryNode = AdminCategoryRow & { children: AdminCategoryRow[] };

/** Mọi danh mục (kể cả đã ẩn) dạng cây 2 cấp, theo sort_order. null nếu lỗi. */
export async function loadAdminCategories(supabase: SupabaseClient<Database>) {
  const { data, error } = await supabase.rpc("admin_list_categories");
  if (error) {
    console.error("loadAdminCategories:", error);
    return null;
  }
  const byOrder = (a: AdminCategoryRow, b: AdminCategoryRow) => a.sort_order - b.sort_order || a.id - b.id;
  return data
    .filter((c) => c.parent_id === null)
    .sort(byOrder)
    .map((m): AdminCategoryNode => ({ ...m, children: data.filter((c) => c.parent_id === m.id).sort(byOrder) }));
}
