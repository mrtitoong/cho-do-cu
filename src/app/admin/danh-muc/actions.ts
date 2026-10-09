"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import type { AdminActionResult } from "@/app/admin/actions";
import { adminErrorMessage, requireAdmin } from "@/lib/admin";
import { categoryInputSchema, type CategoryInput } from "@/lib/category-admin";
import { CATEGORIES_TAG } from "@/lib/categories";
import type { Json } from "@/types/database";

/*
 * Server Action quản lý danh mục. Mọi action gọi requireAdmin() trước; thay đổi đi qua hàm SQL
 * admin_* (kiểm tra is_admin() lần nữa, chặn xóa danh mục có tin / đổi key trường đã có dữ liệu,
 * ghi admin_logs trong cùng giao dịch). Lưu xong xóa cache 'categories' để trang web cập nhật ngay.
 */

const NOT_ADMIN = { ok: false, error: "Bạn không có quyền quản trị." } as const;
const idSchema = z.number().int().positive();

function revalidateCategories(id?: number) {
  revalidateTag(CATEGORIES_TAG, { expire: 0 });
  revalidatePath("/admin/danh-muc");
  if (id) revalidatePath(`/admin/danh-muc/${id}`);
  revalidatePath("/admin/nhat-ky");
}

function saveErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "23505") return "Slug này đã được dùng cho danh mục khác.";
  return adminErrorMessage(error, "Không lưu được danh mục, vui lòng thử lại.");
}

/** Thêm (id không truyền) hoặc sửa danh mục. Trả về id danh mục. */
export async function saveCategory(
  input: CategoryInput,
  id?: number,
): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  if (!admin) return NOT_ADMIN;
  if (id !== undefined && !idSchema.safeParse(id).success) return { ok: false, error: "Mã danh mục không hợp lệ." };

  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const c = parsed.data;

  const { data, error } = await admin.supabase.rpc("admin_save_category", {
    p_id: id,
    p_data: {
      parent_id: c.parentId,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      is_active: c.isActive,
      fields: c.fields as Json,
      color: c.color ?? null,
      price_label: c.priceLabel ?? null,
      requires_images: c.requiresImages ?? null,
    },
  });
  if (error || data === null) {
    console.error("saveCategory:", error);
    return { ok: false, error: error ? saveErrorMessage(error) : "Không lưu được danh mục, vui lòng thử lại." };
  }
  revalidateCategories(data);
  return { ok: true, id: data };
}

/** Bật / ẩn danh mục. Ẩn: tin cũ vẫn hiển thị, không đăng tin mới vào được. */
export async function setCategoryActive(id: number, active: boolean): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!admin) return NOT_ADMIN;
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Mã danh mục không hợp lệ." };

  const { error } = await admin.supabase.rpc("admin_set_category_active", { p_id: id, p_active: active === true });
  if (error) {
    console.error("setCategoryActive:", error);
    return { ok: false, error: adminErrorMessage(error, "Không đổi được trạng thái danh mục, vui lòng thử lại.") };
  }
  revalidateCategories(id);
  return { ok: true };
}

/** Xóa danh mục chưa từng có tin và không có danh mục con (hàm SQL kiểm tra lại). */
export async function deleteCategory(id: number): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!admin) return NOT_ADMIN;
  if (!idSchema.safeParse(id).success) return { ok: false, error: "Mã danh mục không hợp lệ." };

  const { error } = await admin.supabase.rpc("admin_delete_category", { p_id: id });
  if (error) {
    console.error("deleteCategory:", error);
    return { ok: false, error: adminErrorMessage(error, "Không xóa được danh mục, vui lòng thử lại.") };
  }
  revalidateCategories();
  return { ok: true };
}

/** Đổi thứ tự trong cùng cấp: parentId null = các danh mục chính. */
export async function reorderCategories(parentId: number | null, ids: number[]): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!admin) return NOT_ADMIN;
  if (parentId !== null && !idSchema.safeParse(parentId).success) {
    return { ok: false, error: "Mã danh mục không hợp lệ." };
  }
  if (!z.array(idSchema).min(1).max(200).safeParse(ids).success) {
    return { ok: false, error: "Danh sách sắp xếp không hợp lệ." };
  }

  const { error } = await admin.supabase.rpc("admin_reorder_categories", {
    p_ids: ids,
    p_parent_id: parentId ?? undefined,
  });
  if (error) {
    console.error("reorderCategories:", error);
    return { ok: false, error: adminErrorMessage(error, "Không lưu được thứ tự, vui lòng thử lại.") };
  }
  revalidateCategories();
  return { ok: true };
}
