import type { Metadata } from "next";
import Link from "next/link";
import { ListingStatusBadge } from "@/components/admin/badges";
import { PageTitle } from "@/components/layout/page-title";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { param, requireAdminPage } from "@/lib/admin";
import { displayName } from "@/lib/admin-shared";
import { type AdminStats, fullDay, parseStatsRange, sumDaily } from "@/lib/admin-stats";
import { formatDate, formatNumber, formatTimeAgo } from "@/lib/format";
import { ExportCsvButton } from "./export-csv-button";
import { RangePicker } from "./range-picker";
import { type StatCardData, StatCards } from "./stat-cards";
import { CategoryBarChart, DailyChart } from "./stats-charts";

export const metadata: Metadata = { title: "Tổng quan" };

const pctFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

/** Tỉ lệ tin đăng trong kỳ đã bán (%), undefined nếu không tính được. */
function soldRate(stats: AdminStats | null) {
  const listed = stats ? sumDaily(stats.daily, "new_listings") : 0;
  if (!stats?.period || listed === 0) return undefined;
  return (stats.period.new_listings_sold / listed) * 100;
}

function buildCards(cur: AdminStats, prev: AdminStats | null): StatCardData[] {
  const sum = (s: AdminStats | null, key: "new_users" | "new_listings" | "transactions") =>
    s ? sumDaily(s.daily, key) : undefined;
  const p = cur.period;
  const rate = soldRate(cur);
  const prevRate = soldRate(prev);
  const newUsers = sum(cur, "new_users")!;
  const newListings = sum(cur, "new_listings")!;
  const transactions = sum(cur, "transactions")!;

  return [
    {
      label: "Tổng người dùng",
      value: formatNumber(p?.users_at_end ?? cur.totals.total_users),
      current: p?.users_at_end,
      previous: p?.users_at_start,
      hint: `Tính đến hết ngày ${fullDay(cur.to)}`,
    },
    { label: "Người dùng mới", value: formatNumber(newUsers), current: newUsers, previous: sum(prev, "new_users") },
    {
      label: "Tin đang bán",
      value: formatNumber(p?.active_at_end ?? cur.totals.active_listings),
      current: p?.active_at_end,
      previous: p?.active_at_start,
      hint: "So với số tin đang bán ước tính lúc đầu kỳ",
    },
    { label: "Tin mới", value: formatNumber(newListings), current: newListings, previous: sum(prev, "new_listings") },
    {
      label: "Giao dịch thành công",
      value: formatNumber(transactions),
      current: transactions,
      previous: sum(prev, "transactions"),
    },
    {
      label: "Tỉ lệ tin đã bán",
      value: rate === undefined ? "—" : `${pctFormat.format(rate)}%`,
      current: rate,
      previous: prevRate,
      mode: "points",
      hint: "Số tin đăng trong kỳ hiện đã bán / số tin mới trong kỳ",
    },
  ];
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-background p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function AdminHomePage({ searchParams }: PageProps<"/admin">) {
  const { supabase } = await requireAdminPage("/admin");
  const sp = await searchParams;
  const range = parseStatsRange(param(sp.ky), param(sp.tu), param(sp.den));

  const [curRes, prevRes, usersRes, listingsRes] = await Promise.all([
    supabase.rpc("get_admin_stats", { p_from_date: range.from, p_to_date: range.to }),
    supabase.rpc("get_admin_stats", { p_from_date: range.prevFrom, p_to_date: range.prevTo }),
    supabase.rpc("admin_list_users", { p_limit: 10 }),
    supabase.rpc("admin_list_listings", { p_limit: 10 }),
  ]);
  for (const [name, res] of Object.entries({ curRes, prevRes, usersRes, listingsRes })) {
    if (res.error) console.error(`AdminHomePage ${name}:`, res.error);
  }
  const stats = curRes.data as unknown as AdminStats | null;
  const prev = prevRes.data as unknown as AdminStats | null;
  const newUsers = usersRes.data ?? [];
  const newListings = listingsRes.data ?? [];
  const provinces = stats?.by_province.slice(0, 10) ?? [];

  return (
    <div className="space-y-4">
      <PageTitle title="Tổng quan" description="Số liệu hoạt động của nền tảng theo khoảng thời gian." />
      <RangePicker range={range} />

      {!stats ? (
        <p className="rounded-lg border border-destructive/50 bg-background p-4 text-sm text-destructive">
          Không tải được thống kê, vui lòng tải lại trang.
        </p>
      ) : (
        <>
          <StatCards cards={buildCards(stats, prev)} />

          <Section
            title="Hoạt động theo ngày"
            action={<ExportCsvButton daily={stats.daily} from={stats.from} to={stats.to} />}
          >
            <DailyChart daily={stats.daily} />
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-muted-foreground">Xem dạng bảng</summary>
              <div className="mt-2 max-h-80 overflow-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày</TableHead>
                      <TableHead className="text-right">Người dùng mới</TableHead>
                      <TableHead className="text-right">Tin mới</TableHead>
                      <TableHead className="text-right">Giao dịch</TableHead>
                      <TableHead className="text-right">Tin nhắn</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="tabular-nums">
                    {stats.daily.map((d) => (
                      <TableRow key={d.date}>
                        <TableCell>{fullDay(d.date)}</TableCell>
                        <TableCell className="text-right">{formatNumber(d.new_users)}</TableCell>
                        <TableCell className="text-right">{formatNumber(d.new_listings)}</TableCell>
                        <TableCell className="text-right">{formatNumber(d.transactions)}</TableCell>
                        <TableCell className="text-right">{formatNumber(d.messages)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </details>
          </Section>

          <div className="grid gap-4 xl:grid-cols-2">
            <Section title="Tin đang bán theo danh mục">
              <CategoryBarChart
                data={stats.by_category}
                dataKey="active_listings"
                label="Tin đang bán"
                color="var(--viz-2)"
              />
            </Section>
            <Section title="Giao dịch trong kỳ theo danh mục">
              <CategoryBarChart
                data={stats.by_category}
                dataKey="transactions"
                label="Giao dịch"
                color="var(--viz-3)"
              />
            </Section>
          </div>

          <Section title="Top 10 tỉnh/thành nhiều tin nhất">
            {!provinces.length ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Chưa có tin nào.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead>Tỉnh/thành</TableHead>
                    <TableHead className="text-right">Tin đang bán</TableHead>
                    <TableHead className="text-right">Tin mới trong kỳ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="tabular-nums">
                  {provinces.map((p, i) => (
                    <TableRow key={p.province}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{p.province}</TableCell>
                      <TableCell className="text-right">{formatNumber(p.active_listings)}</TableCell>
                      <TableCell className="text-right">{formatNumber(p.new_listings)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Section>
        </>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Section
          title="10 người dùng mới"
          action={
            <Link href="/admin/nguoi-dung" className="text-sm text-primary hover:underline">
              Xem tất cả
            </Link>
          }
        >
          {!newUsers.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Chưa có người dùng.</p>
          ) : (
            <ul className="divide-y">
              {newUsers.map((u) => (
                <li key={u.id}>
                  <Link
                    href={`/admin/nguoi-dung/${u.id}`}
                    className="flex min-h-11 items-center justify-between gap-3 py-2 hover:bg-muted/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{displayName(u)}</span>
                      <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(u.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="10 tin mới nhất"
          action={
            <Link href="/admin/tin-dang" className="text-sm text-primary hover:underline">
              Xem tất cả
            </Link>
          }
        >
          {!newListings.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Chưa có tin nào.</p>
          ) : (
            <ul className="divide-y">
              {newListings.map((l) => (
                <li key={l.id} className="flex min-h-11 items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <Link
                      href={`/admin/tin-dang?${new URLSearchParams({ q: l.title, nguoi_dang_id: l.seller_id })}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {l.title}
                    </Link>
                    <span className="block truncate text-xs text-muted-foreground">
                      {l.main_category_name} › {l.category_name} ·{" "}
                      <Link href={`/admin/nguoi-dung/${l.seller_id}`} className="hover:underline">
                        {l.seller_name?.trim() || l.seller_email || "Người dùng"}
                      </Link>{" "}
                      · {formatTimeAgo(l.created_at)}
                    </span>
                  </span>
                  <ListingStatusBadge status={l.status} />
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
