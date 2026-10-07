import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { RoleBadge, UserStatusBadge } from "@/components/admin/badges";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireAdminPage } from "@/lib/admin";
import { displayName } from "@/lib/admin-shared";
import { formatDate, formatDateTime, formatNumber, formatPrice, formatTimeAgo } from "@/lib/format";
import { ListingsTable } from "../../tin-dang/listings-table";
import { UserActions } from "./user-actions";

export const metadata: Metadata = { title: "Chi tiết người dùng" };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LISTING_LIMIT = 50;

const HISTORY_LABEL: Record<string, string> = {
  "user.ban": "Khóa tài khoản",
  "user.unban": "Mở khóa",
  "user.grant_admin": "Cấp quyền admin",
  "user.revoke_admin": "Thu quyền admin",
};

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function AdminUserDetailPage({ params }: PageProps<"/admin/nguoi-dung/[id]">) {
  const { id } = await params;
  const { supabase, user: me } = await requireAdminPage(`/admin/nguoi-dung/${id}`);
  if (!UUID_RE.test(id)) notFound();

  const [{ data: users, error }, { data: listings }, { data: transactions }, { data: history }] = await Promise.all([
    supabase.rpc("admin_list_users", { p_user_id: id }),
    supabase.rpc("admin_list_listings", { p_seller_id: id, p_limit: LISTING_LIMIT }),
    supabase
      .from("transactions")
      .select(
        `id, final_price, completed_at, seller_id, buyer_id,
         listing:listings(id, title),
         seller:profiles!transactions_seller_id_fkey(id, full_name),
         buyer:profiles!transactions_buyer_id_fkey(id, full_name)`,
      )
      .or(`seller_id.eq.${id},buyer_id.eq.${id}`)
      .order("completed_at", { ascending: false })
      .limit(50),
    supabase
      .from("admin_logs")
      .select("id, action, detail, created_at, admin:profiles(full_name)")
      .eq("target_type", "user")
      .eq("target_id", id)
      .in("action", Object.keys(HISTORY_LABEL))
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (error) console.error("AdminUserDetailPage:", error);
  const u = users?.[0];
  if (!u) notFound();

  const name = displayName(u);
  const listingTotal = listings?.[0]?.total_count ?? 0;

  return (
    <div className="space-y-8">
      <Button asChild variant="ghost" className="-ml-3">
        <Link href="/admin/nguoi-dung">
          <ArrowLeft /> Danh sách người dùng
        </Link>
      </Button>

      {/* Thông tin */}
      <div className="space-y-4 rounded-xl border bg-background p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar className="size-16">
            {u.avatar_url && <AvatarImage src={u.avatar_url} alt="" />}
            <AvatarFallback className="text-xl">{name.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{name}</h1>
            <div className="mt-1 flex flex-wrap gap-2">
              <RoleBadge role={u.role} />
              <UserStatusBadge banned={u.is_banned} />
            </div>
          </div>
        </div>

        {u.is_banned && u.banned_reason && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <span className="font-medium text-destructive">Lý do khóa:</span> {u.banned_reason}
          </p>
        )}

        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Email", u.email ?? "—"],
            ["Số điện thoại", u.phone ?? "—"],
            ["Ngày tham gia", formatDate(u.created_at)],
            ["Hoạt động cuối", u.last_seen_at ? formatTimeAgo(u.last_seen_at) : "—"],
            ["Tin đang bán", formatNumber(u.active_listings)],
            ["Giao dịch", formatNumber(u.transactions)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-dashed pb-2 sm:justify-start">
              <dt className="text-muted-foreground sm:w-32 sm:shrink-0">{label}</dt>
              <dd className="truncate font-medium">{value}</dd>
            </div>
          ))}
        </dl>

        <UserActions userId={u.id} name={name} isBanned={u.is_banned} role={u.role} isSelf={u.id === me.id} />
      </div>

      <Section
        title={`Tin đăng (${formatNumber(listingTotal)})`}
        action={
          listingTotal > LISTING_LIMIT && (
            <Button asChild variant="link">
              <Link href={`/admin/tin-dang?nguoi_dang_id=${u.id}`}>Xem tất cả</Link>
            </Button>
          )
        }
      >
        <ListingsTable rows={listings ?? []} hideSeller />
      </Section>

      <Section title="Giao dịch">
        <div className="overflow-hidden rounded-xl border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tin</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Bên kia</TableHead>
                <TableHead>Giá chốt</TableHead>
                <TableHead>Thời gian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!transactions?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                    Chưa có giao dịch nào.
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((t) => {
                  const selling = t.seller_id === u.id;
                  const other = selling ? t.buyer : t.seller;
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="max-w-72 truncate">
                        {t.listing ? (
                          <a href={`/tin/${t.listing.id}`} target="_blank" rel="noreferrer" className="hover:underline">
                            {t.listing.title}
                          </a>
                        ) : (
                          <span className="text-muted-foreground">Tin đã xóa</span>
                        )}
                      </TableCell>
                      <TableCell>{selling ? "Người bán" : "Người mua"}</TableCell>
                      <TableCell>
                        {other ? (
                          <Link href={`/admin/nguoi-dung/${other.id}`} className="hover:underline">
                            {other.full_name?.trim() || "Chưa đặt tên"}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Ngoài nền tảng</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {t.final_price === null ? "Thỏa thuận" : formatPrice(t.final_price)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDateTime(t.completed_at)}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Section>

      <Section title="Lịch sử khóa và phân quyền">
        {!history?.length ? (
          <p className="text-sm text-muted-foreground">Chưa có lần khóa hoặc đổi quyền nào.</p>
        ) : (
          <ol className="space-y-2">
            {history.map((h) => {
              const detail = (h.detail ?? {}) as { reason?: string; hidden_listings?: number };
              return (
                <li key={h.id} className="rounded-lg border bg-background p-3 text-sm">
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="font-medium">{HISTORY_LABEL[h.action] ?? h.action}</span>
                    <span className="text-muted-foreground">
                      {formatDateTime(h.created_at)} · bởi {h.admin?.full_name?.trim() || "admin"}
                    </span>
                  </div>
                  {detail.reason && <p className="mt-1">Lý do: {detail.reason}</p>}
                  {typeof detail.hidden_listings === "number" && (
                    <p className="mt-1 text-muted-foreground">Đã ẩn {detail.hidden_listings} tin đang bán.</p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </Section>
    </div>
  );
}
