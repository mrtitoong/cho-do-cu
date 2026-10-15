import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CUSTOM_RANGE, RANGE_PRESETS, type StatsRange, fullDay, todayVN } from "@/lib/admin-stats";

/** Bộ chọn khoảng thời gian: 7 / 30 / 90 ngày (link) hoặc tùy chọn (form GET). Trạng thái nằm trên URL. */
export function RangePicker({ range }: { range: StatsRange }) {
  const today = todayVN();

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-background p-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Khoảng thời gian">
        {RANGE_PRESETS.map((p) => (
          <Button
            key={p.value}
            asChild
            variant={range.key === p.value ? "default" : "outline"}
            className="h-10"
            aria-current={range.key === p.value ? "true" : undefined}
          >
            <Link href={`/admin?ky=${p.value}`}>{p.label}</Link>
          </Button>
        ))}
      </div>

      <form action="/admin" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="ky" value={CUSTOM_RANGE} />
        <div className="space-y-1">
          <Label htmlFor="range-from" className="text-xs text-muted-foreground">
            Từ ngày
          </Label>
          <Input id="range-from" type="date" name="tu" defaultValue={range.from} max={today} className="h-10 w-40" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="range-to" className="text-xs text-muted-foreground">
            Đến ngày
          </Label>
          <Input id="range-to" type="date" name="den" defaultValue={range.to} max={today} className="h-10 w-40" required />
        </div>
        <Button type="submit" variant={range.key === CUSTOM_RANGE ? "default" : "outline"} className="h-10">
          Tùy chọn
        </Button>
      </form>

      <p className="w-full text-sm text-muted-foreground">
        {fullDay(range.from)} – {fullDay(range.to)} ({range.days} ngày), so với kỳ trước {fullDay(range.prevFrom)} –{" "}
        {fullDay(range.prevTo)}.
      </p>
      {range.error && <p className="w-full text-sm text-destructive">{range.error} Đang hiển thị 30 ngày gần nhất.</p>}
    </div>
  );
}
