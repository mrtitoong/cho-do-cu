import { z } from "zod";
import { slugify } from "@/lib/category-admin";

/* Kiểu, hằng số và hàm thuần của tin tức, dùng được cả ở server lẫn trình duyệt. */

/** Bucket Storage chứa ảnh tin tức (công khai để đọc, chỉ Admin upload). */
export const POST_IMAGES_BUCKET = "post-images";

/** Số bài mỗi trang ở /tin-tuc. */
export const POSTS_PAGE_SIZE = 12;

export type PostStatus = "draft" | "published";

export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  draft: "Nháp",
  published: "Đã đăng",
};

/** Ảnh bìa: covers/{uuid}.webp; ảnh trong nội dung: content/{uuid}.webp (hàm SQL kiểm tra lại ảnh bìa). */
export const POST_COVER_RE = /^covers\/[0-9a-f-]{36}\.(webp|jpg)$/;

/** URL công khai của ảnh trong bucket post-images. */
export function postImageUrl(path: string) {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${postImagesBaseUrl()}${encoded}`;
}

/** Tiền tố URL công khai của bucket, VD https://xxx.supabase.co/storage/v1/object/public/post-images/ */
export function postImagesBaseUrl() {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${POST_IMAGES_BUCKET}/`;
}

/** "Hướng dẫn đăng tin an toàn" → "huong-dan-dang-tin-an-toan" */
export function postSlugFromTitle(title: string) {
  return slugify(title, "-", 100);
}

export const POST_SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Dữ liệu form soạn bài (kiểm tra lại trên server trong Server Action và hàm SQL). */
export const postInputSchema = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tiêu đề.").max(200, "Tiêu đề tối đa 200 ký tự."),
  slug: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập slug.")
    .max(120, "Slug tối đa 120 ký tự.")
    .regex(POST_SLUG_RE, "Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang."),
  excerpt: z.string().trim().max(500, "Mô tả ngắn tối đa 500 ký tự."),
  coverPath: z.string().regex(POST_COVER_RE, "Ảnh bìa không hợp lệ.").nullable(),
  isFeatured: z.boolean(),
  /** JSON của Tiptap: { type: "doc", content: [...] } */
  content: z.object({ type: z.literal("doc") }).loose(),
});

export type PostInput = z.infer<typeof postInputSchema>;

export const EMPTY_POST_CONTENT: PostInput["content"] = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
