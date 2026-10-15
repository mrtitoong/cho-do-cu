/* Kiểu dữ liệu và hàm thuần cho trang Tổng quan Admin (get_admin_stats), dùng được cả server lẫn trình duyệt. */

export type DailyStat = {
  date: string;
  new_users: number;
  new_listings: number;
  transactions: number;
  messages: number;
};

export type CategoryStat = {
  category_id: number;
  slug: string;
  name: string;
  color: string | null;
  active_listings: number;
  new_listings: number;
  transactions: number;
};

export type ProvinceStat = { province: string; active_listings: number; new_listings: number };

export type AdminStats = {
  from: string;
  to: string;
  totals: {
    total_users: number;
    active_listings: number;
    total_listings: number;
    sold_listings: number;
    total_transactions: number;
  };
  daily: DailyStat[];
  by_category: CategoryStat[];
  by_province: ProvinceStat[];
  /** Có từ migration 0010; thiếu nếu chưa chạy migration. */
  period?: {
    users_at_start: number;
    users_at_end: number;
    active_at_start: number;
    active_at_end: number;
    new_listings_sold: number;
  };
};

export const RANGE_PRESETS = [
  { value: "7", label: "7 ngày", days: 7 },
  { value: "30", label: "30 ngày", days: 30 },
  { value: "90", label: "90 ngày", days: 90 },
] as const;

export const CUSTOM_RANGE = "tuy-chon";
const DEFAULT_DAYS = 30;
/** get_admin_stats cho phép tối đa 366 ngày giữa 2 đầu. */
const MAX_DAYS = 366;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Ngày hôm nay theo giờ Việt Nam: "2026-10-15". */
export function todayVN() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

/** "2026-10-15" + 3 → "2026-10-18" (tính trên UTC để không lệch múi giờ). */
export function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Số ngày từ a đến b (b - a). */
export function diffDays(a: string, b: string) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

function isValidDate(s: string | undefined): s is string {
  return !!s && DATE_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && addDays(s, 0) === s;
}

export type StatsRange = {
  /** "7" | "30" | "90" | "tuy-chon" */
  key: string;
  from: string;
  to: string;
  days: number;
  prevFrom: string;
  prevTo: string;
  /** Thông báo khi khoảng tùy chọn không hợp lệ (đã quay về mặc định). */
  error?: string;
};

/** Đọc khoảng thời gian từ URL: ?ky=7|30|90|tuy-chon&tu=YYYY-MM-DD&den=YYYY-MM-DD. Mặc định 30 ngày. */
export function parseStatsRange(ky: string | undefined, tu: string | undefined, den: string | undefined): StatsRange {
  const today = todayVN();
  const withPrev = (key: string, from: string, to: string, error?: string): StatsRange => {
    const days = diffDays(from, to) + 1;
    return { key, from, to, days, prevFrom: addDays(from, -days), prevTo: addDays(from, -1), error };
  };
  const preset = (days: number, error?: string) =>
    withPrev(String(days), addDays(today, -(days - 1)), today, error);

  if (ky === CUSTOM_RANGE) {
    if (!isValidDate(tu) || !isValidDate(den)) return preset(DEFAULT_DAYS, "Vui lòng chọn đủ ngày bắt đầu và kết thúc.");
    if (tu > den) return preset(DEFAULT_DAYS, "Ngày bắt đầu phải trước ngày kết thúc.");
    if (diffDays(tu, den) + 1 > MAX_DAYS) return preset(DEFAULT_DAYS, `Khoảng thời gian tối đa ${MAX_DAYS} ngày.`);
    return withPrev(CUSTOM_RANGE, tu, den);
  }
  const p = RANGE_PRESETS.find((r) => r.value === ky);
  return preset(p?.days ?? DEFAULT_DAYS);
}

export function sumDaily(daily: DailyStat[], key: keyof Omit<DailyStat, "date">) {
  return daily.reduce((s, d) => s + d[key], 0);
}

/** % thay đổi so với kỳ trước; kỳ trước = 0 thì không tính được (null). */
export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

/** "2026-10-15" → "15/10" */
export function shortDay(date: string) {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

/** "2026-10-15" → "15/10/2026" */
export function fullDay(date: string) {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
}

/** Số liệu theo ngày → CSV (có BOM để Excel đọc đúng tiếng Việt). */
export function dailyToCsv(daily: DailyStat[]) {
  const header = ["Ngày", "Người dùng mới", "Tin mới", "Giao dịch", "Tin nhắn"];
  const rows = daily.map((d) => [d.date, d.new_users, d.new_listings, d.transactions, d.messages]);
  return "﻿" + [header, ...rows].map((r) => r.join(",")).join("\r\n");
}
