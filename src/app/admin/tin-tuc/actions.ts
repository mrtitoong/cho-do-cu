"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AdminActionResult } from "@/app/admin/actions";
import { adminErrorMessage, requireAdmin } from "@/lib/admin";
import { renderPostHtml } from "@/lib/post-html";
import { POST_IMAGES_BUCKET, postImagesBaseUrl, postInputSchema, type PostInput, type PostStatus } from "@/lib/posts";
import type { Json } from "@/types/database";

/*
 * Server Action quản lý tin tức. Mọi action gọi requireAdmin() trước; thay đổi đi qua hàm SQL
 * admin_save_post / admin_delete_post (kiểm tra is_admin() lần nữa, ghi admin_logs trong cùng giao dịch).
 * Đăng hoặc sửa bài xong thì xóa cache trang chủ và /tin-tuc.
 */

const NOT_ADMIN = { ok: false, error: "Bạn không có quyền quản trị." } as const;
const uuid = z.uuid();

function revalidatePosts(id: string | null, isPublic: boolean) {
  revalidatePath("/admin/tin-tuc");
  if (id) revalidatePath(`/admin/tin-tuc/${id}`);
  revalidatePath("/admin/nhat-ky");
  if (isPublic) {
    revalidatePath("/");
    revalidatePath("/tin-tuc", "layout"); // gồm cả /tin-tuc/[slug]
  }
}

function saveErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "23505") return "Slug này đã được dùng cho bài khác.";
  return adminErrorMessage(error, "Không lưu được bài viết, vui lòng thử lại.");
}

/** Các ảnh trong bucket post-images mà nội dung Tiptap đang dùng (đường dẫn trong bucket). */
function contentImagePaths(node: unknown, base = postImagesBaseUrl(), out: string[] = []) {
  if (!node || typeof node !== "object") return out;
  const n = node as {
    type?: string;
    attrs?: { src?: unknown };
    content?: unknown[];
  };
  if (n.type === "image" && typeof n.attrs?.src === "string" && n.attrs.src.startsWith(base)) {
    out.push(decodeURIComponent(n.attrs.src.slice(base.length)));
  }
  if (Array.isArray(n.content)) for (const child of n.content) contentImagePaths(child, base, out);
  return out;
}

type SaveOptions = {
  status: PostStatus;
  /** Tự lưu nháp: không ghi nhật ký mỗi lần (hàm SQL gộp trong 10 phút) */
  autosave?: boolean;
};

/** Thêm (id null) hoặc sửa bài. Trả về id bài. */
export async function savePost(
  id: string | null,
  input: PostInput,
  { status, autosave = false }: SaveOptions,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  if (!admin) return NOT_ADMIN;
  if (id !== null && !uuid.safeParse(id).success) return { ok: false, error: "Mã bài viết không hợp lệ." };
  if (status !== "draft" && status !== "published") return { ok: false, error: "Trạng thái không hợp lệ." };

  const parsed = postInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const p = parsed.data;
  if (status === "published" && !p.excerpt) return { ok: false, error: "Vui lòng nhập mô tả ngắn trước khi đăng bài." };

  // Ảnh bìa cũ (để xóa file nếu đã đổi ảnh) và trạng thái cũ (để biết có cần xóa cache trang công khai)
  const { data: old } = id
    ? await admin.supabase.from("posts").select("cover_path, status").eq("id", id).maybeSingle()
    : { data: null };

  const { data, error } = await admin.supabase.rpc("admin_save_post", {
    p_id: id,
    p_data: {
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      cover_path: p.coverPath,
      content: p.content as Json,
      status,
      is_featured: p.isFeatured,
    },
    p_autosave: autosave,
  });
  if (error || !data) {
    if (!autosave) console.error("savePost:", error);
    return {
      ok: false,
      error: error ? saveErrorMessage(error) : "Không lưu được bài viết, vui lòng thử lại.",
    };
  }

  if (old?.cover_path && old.cover_path !== p.coverPath) {
    const { error: removeError } = await admin.supabase.storage.from(POST_IMAGES_BUCKET).remove([old.cover_path]);
    if (removeError) console.error("savePost: xóa ảnh bìa cũ", removeError);
  }

  revalidatePosts(data, status === "published" || old?.status === "published");
  return { ok: true, id: data };
}

/** Xóa hẳn bài viết, kèm ảnh bìa và ảnh trong nội dung. */
export async function deletePost(id: string): Promise<AdminActionResult> {
  const admin = await requireAdmin();
  if (!admin) return NOT_ADMIN;
  if (!uuid.safeParse(id).success) return { ok: false, error: "Mã bài viết không hợp lệ." };

  const { data: post } = await admin.supabase.from("posts").select("cover_path, content").eq("id", id).maybeSingle();

  const { error } = await admin.supabase.rpc("admin_delete_post", { p_id: id });
  if (error) {
    console.error("deletePost:", error);
    return {
      ok: false,
      error: adminErrorMessage(error, "Không xóa được bài viết, vui lòng thử lại."),
    };
  }

  if (post) {
    const paths = [...(post.cover_path ? [post.cover_path] : []), ...contentImagePaths(post.content)];
    if (paths.length) {
      const { error: removeError } = await admin.supabase.storage.from(POST_IMAGES_BUCKET).remove(paths);
      if (removeError) console.error("deletePost: xóa ảnh", removeError);
    }
  }
  revalidatePosts(null, true);
  return { ok: true };
}

/** HTML xem trước: dùng đúng hàm hiển thị (và lọc) của trang công khai. */
export async function previewPost(
  content: unknown,
): Promise<{ ok: true; html: string } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  if (!admin) return NOT_ADMIN;
  return { ok: true, html: renderPostHtml(content) };
}
