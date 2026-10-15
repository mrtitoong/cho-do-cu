import { BadgeCheck, Store, Users } from "lucide-react";
import { STATS_MIN_VISIBLE } from "@/config/home";
import type { PublicStats } from "@/lib/home-data";
import { CountUp } from "./count-up";

/** 3 con số lớn của nền tảng. Số dưới STATS_MIN_VISIBLE bị ẩn; không còn số nào thì ẩn cả khối. */
export function PlatformStats({ stats }: { stats: PublicStats }) {
  const items = [
    { label: "Người dùng", value: stats.total_users, icon: Users },
    { label: "Giao dịch thành công", value: stats.total_transactions, icon: BadgeCheck },
    { label: "Tin đang bán", value: stats.active_listings, icon: Store },
  ].filter((item) => item.value >= STATS_MIN_VISIBLE);

  if (items.length === 0) return null;

  return (
    <section aria-label="Thống kê nền tảng" className="rounded-2xl bg-primary/5 px-2 py-5 sm:px-6 sm:py-8">
      <dl className="flex justify-around gap-2 text-center">
        {items.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <Icon className="hidden size-6 text-primary sm:block" />
            <dt className="order-last text-xs text-muted-foreground sm:text-sm">{label}</dt>
            <dd className="text-xl font-bold text-primary sm:text-4xl">
              <CountUp value={value} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
