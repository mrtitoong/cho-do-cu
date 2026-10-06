import type { Database } from "@/types/database";

export const MAX_MESSAGE_LENGTH = 1000;
/** Số tin nhắn mỗi lần tải. */
export const MESSAGE_PAGE_SIZE = 50;

export const QUICK_REPLIES = [
  "Sản phẩm còn không ạ?",
  "Giá có thương lượng không?",
  "Cho mình xem thêm ảnh được không?",
];

export type MessageRow = Database["public"]["Tables"]["messages"]["Row"];
export type InboxItem = Database["public"]["Functions"]["get_inbox"]["Returns"][number];

/** Cột tin nhắn client cần đọc. */
export const MESSAGE_COLUMNS = "id, conversation_id, sender_id, body, created_at, read_at";

/** Người dùng ở Việt Nam: cố định múi giờ để server và trình duyệt render giống nhau. */
const TIME_ZONE = "Asia/Ho_Chi_Minh";
const timeFormat = new Intl.DateTimeFormat("vi-VN", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" });
const dayKeyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }); // "2026-10-06"
const shortDateFormat = new Intl.DateTimeFormat("vi-VN", { timeZone: TIME_ZONE, day: "2-digit", month: "2-digit" });
const longDateFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

/** Khóa ngày (theo giờ Việt Nam) để nhóm tin nhắn. */
export function dayKey(date: string | Date) {
  return dayKeyFormat.format(new Date(date));
}

function relativeDay(date: string | Date, now: Date) {
  const key = dayKey(date);
  if (key === dayKey(now)) return "today";
  if (key === dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000))) return "yesterday";
  return null;
}

/** "14:05" */
export function formatMessageTime(date: string | Date) {
  return timeFormat.format(new Date(date));
}

/** Nhãn ngày giữa các nhóm tin nhắn: "Hôm nay", "Hôm qua", "thứ Hai, 05/10/2026". */
export function formatDayLabel(date: string | Date, now = new Date()) {
  const rel = relativeDay(date, now);
  if (rel === "today") return "Hôm nay";
  if (rel === "yesterday") return "Hôm qua";
  return longDateFormat.format(new Date(date));
}

/** Thời gian trong hộp thư: "14:05" (hôm nay), "Hôm qua", "05/10". */
export function formatInboxTime(date: string | Date, now = new Date()) {
  const rel = relativeDay(date, now);
  if (rel === "today") return formatMessageTime(date);
  if (rel === "yesterday") return "Hôm qua";
  return shortDateFormat.format(new Date(date));
}

/** UUID v4; crypto.randomUUID chỉ có trên HTTPS/localhost nên có dự phòng (thử qua IP mạng LAN). */
export function newMessageId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Tên hiển thị của người kia (hồ sơ có thể chưa đặt tên). */
export function displayName(name: string | null | undefined) {
  return name?.trim() || "Người dùng";
}

export const LISTING_STATUS_LABELS: Record<string, string> = {
  active: "Đang bán",
  sold: "Đã bán",
  hidden: "Đã ẩn",
};
