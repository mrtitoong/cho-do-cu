/**
 * Địa chỉ gốc của website (dùng cho sitemap, robots, ảnh Open Graph).
 * Khai báo NEXT_PUBLIC_SITE_URL khi có tên miền riêng; trên Vercel tự dùng tên miền production.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  "http://localhost:3000"
).replace(/\/$/, "");

export const SITE_NAME = "Chợ Đồ Cũ";
