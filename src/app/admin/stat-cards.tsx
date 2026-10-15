import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { percentChange } from "@/lib/admin-stats";

const pctFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });

export type StatCardData = {
  label: string;
  /** Số chính đã định dạng */
  value: string;
  /** Kỳ hiện tại / kỳ trước để tính % (undefined = không so sánh được). */
  current?: number;
  previous?: number;
  /** "percent": % thay đổi; "points": chênh lệch điểm % (cho số liệu vốn là tỉ lệ). */
  mode?: "percent" | "points";
  hint?: string;
};

function Delta({ current, previous, mode = "percent" }: Pick<StatCardData, "current" | "previous" | "mode">) {
  if (current === undefined || previous === undefined) {
    return <span className="text-muted-foreground">Chưa có số liệu kỳ trước</span>;
  }
  const change = mode === "points" ? current - previous : percentChange(current, previous);
  if (change === null) {
    return <span className="text-muted-foreground">Kỳ trước: 0</span>;
  }
  const rounded = Math.round(change * 10) / 10;
  const Icon = rounded > 0 ? TrendingUp : rounded < 0 ? TrendingDown : Minus;
  const color = rounded > 0 ? "text-(--viz-up)" : rounded < 0 ? "text-(--viz-down)" : "text-muted-foreground";
  const sign = rounded > 0 ? "+" : "";
  const unit = mode === "points" ? " điểm %" : "%";
  return (
    <span className={`inline-flex items-center gap-1 font-medium ${color}`}>
      <Icon className="size-4" aria-hidden />
      {sign}
      {pctFormat.format(rounded)}
      {unit}
      <span className="font-normal text-muted-foreground">so với kỳ trước</span>
    </span>
  );
}

export function StatCards({ cards }: { cards: StatCardData[] }) {
  return (
    <div className="admin-viz grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border bg-background p-4">
          <p className="text-sm text-muted-foreground">{c.label}</p>
          <p className="mt-1 text-3xl font-bold tracking-tight">{c.value}</p>
          <p className="mt-2 text-xs">
            <Delta current={c.current} previous={c.previous} mode={c.mode} />
          </p>
          {c.hint && <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>}
        </div>
      ))}
    </div>
  );
}
