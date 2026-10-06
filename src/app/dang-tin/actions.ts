"use server";

import { getSubCategory } from "@/config/categories";
import { buildZodSchema, toListingRow } from "@/lib/listing-schema";
import { createClient } from "@/lib/supabase/server";

export type CreateListingResult =
  | { ok: true; id: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Tạo tin mới. Dữ liệu được kiểm tra lại bằng zod trên server, không tin dữ liệu từ trình duyệt. */
export async function createListing(categorySlug: string, values: unknown): Promise<CreateListingResult> {
  const sub = getSubCategory(categorySlug);
  if (!sub) return { ok: false, error: "Danh mục không hợp lệ." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Bạn cần đăng nhập để đăng tin." };

  const parsed = buildZodSchema(categorySlug).safeParse(values);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      fieldErrors[path] ??= issue.message;
    }
    return { ok: false, error: "Thông tin chưa hợp lệ, vui lòng kiểm tra lại.", fieldErrors };
  }

  const { data: category, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", sub.slug)
    .single();
  if (categoryError || !category) return { ok: false, error: "Không tìm thấy danh mục trong cơ sở dữ liệu." };

  // seller_id lấy mặc định auth.uid() trong DB; location tạm để trống (làm ở giai đoạn 3b)
  const { data: listing, error } = await supabase
    .from("listings")
    .insert({ category_id: category.id, ...toListingRow(sub, parsed.data) })
    .select("id")
    .single();
  if (error || !listing) {
    console.error("createListing:", error);
    return { ok: false, error: "Không đăng được tin, vui lòng thử lại." };
  }

  return { ok: true, id: listing.id };
}
