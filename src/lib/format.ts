const numberFormat = new Intl.NumberFormat("vi-VN");
const shortFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

/** 1500000 → "1.500.000" */
export function formatNumber(n: number) {
  return numberFormat.format(n);
}

/** Lấy phần chữ số của chuỗi người dùng gõ: "1.500.000 đ" → 1500000 (rỗng → undefined). */
export function parseDigits(text: string): number | undefined {
  const digits = text.replace(/\D/g, "");
  return digits ? Number(digits) : undefined;
}

/** 1500000 → "1.500.000 đ" */
export function formatPrice(n: number) {
  return `${formatNumber(n)} đ`;
}

/** Giá rút gọn cho thẻ tin: 1500000 → "1,5 triệu", 2300000000 → "2,3 tỷ", 500000 → "500 nghìn". */
export function formatPriceShort(n: number) {
  if (n >= 1_000_000_000) return `${shortFormat.format(n / 1_000_000_000)} tỷ`;
  if (n >= 1_000_000) return `${shortFormat.format(n / 1_000_000)} triệu`;
  if (n >= 1_000) return `${shortFormat.format(n / 1_000)} nghìn`;
  return formatPrice(n);
}

/** Khoảng cách: 350 → "350 m", 1234 → "1,2 km". */
export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  return `${shortFormat.format(Math.round(meters / 100) / 10)} km`;
}

/** Thời gian tương đối: "Vừa xong", "15 phút trước", "3 giờ trước", "2 ngày trước"... */
export function formatTimeAgo(date: string | Date, now = Date.now()) {
  const seconds = Math.max(0, (now - new Date(date).getTime()) / 1000);
  const units: [limit: number, size: number, label: string][] = [
    [60 * 60, 60, "phút"],
    [24 * 60 * 60, 60 * 60, "giờ"],
    [30 * 24 * 60 * 60, 24 * 60 * 60, "ngày"],
    [365 * 24 * 60 * 60, 30 * 24 * 60 * 60, "tháng"],
    [Infinity, 365 * 24 * 60 * 60, "năm"],
  ];
  if (seconds < 60) return "Vừa xong";
  const [, size, label] = units.find(([limit]) => seconds < limit)!;
  return `${Math.floor(seconds / size)} ${label} trước`;
}

const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "Asia/Ho_Chi_Minh",
});
const dateTimeFormat = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Ho_Chi_Minh",
});

/** "07/10/2026" */
export function formatDate(date: string | Date) {
  return dateFormat.format(new Date(date));
}

/** "14:05 07/10/2026" */
export function formatDateTime(date: string | Date) {
  return dateTimeFormat.format(new Date(date));
}
