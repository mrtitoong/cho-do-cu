import type { Database } from "@/types/database";

/* Kiểu và hàm thuần của khu vực Admin, dùng được cả ở server lẫn trình duyệt. */

type Fn = Database["public"]["Functions"];

export type AdminUserRow = Fn["admin_list_users"]["Returns"][number];
export type AdminListingRow = Fn["admin_list_listings"]["Returns"][number];

export function displayName(user: { full_name: string | null; email: string | null }) {
  return user.full_name?.trim() || user.email || "Chưa đặt tên";
}
