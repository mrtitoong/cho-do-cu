import { Badge } from "@/components/ui/badge";

export function RoleBadge({ role }: { role: string }) {
  return role === "admin" ? <Badge>Admin</Badge> : <Badge variant="outline">Người dùng</Badge>;
}

export function UserStatusBadge({ banned }: { banned: boolean }) {
  return banned ? <Badge variant="destructive">Bị khóa</Badge> : <Badge variant="secondary">Hoạt động</Badge>;
}

const LISTING_STATUS: Record<string, { label: string; variant: "secondary" | "outline" | "destructive" | "default" }> = {
  active: { label: "Đang hiển thị", variant: "default" },
  sold: { label: "Đã bán", variant: "secondary" },
  hidden: { label: "Đã ẩn", variant: "outline" },
  removed: { label: "Đã gỡ", variant: "destructive" },
};

export const LISTING_STATUS_OPTIONS = Object.entries(LISTING_STATUS).map(([value, s]) => ({ value, label: s.label }));

export function ListingStatusBadge({ status }: { status: string }) {
  const s = LISTING_STATUS[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
