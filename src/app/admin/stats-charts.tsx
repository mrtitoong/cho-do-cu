"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  type CategoryStat,
  type DailyStat,
  fullDay,
  shortDay,
} from "@/lib/admin-stats";
import { formatNumber } from "@/lib/format";

const AXIS_TICK = { fill: "var(--viz-muted)", fontSize: 12 };

const DAILY_SERIES = [
  { key: "new_users", label: "Người dùng mới", color: "var(--viz-1)" },
  { key: "new_listings", label: "Tin mới", color: "var(--viz-2)" },
  { key: "transactions", label: "Giao dịch", color: "var(--viz-3)" },
] as const;

type TooltipItem = {
  name?: string | number;
  value?: unknown;
  color?: string;
  dataKey?: unknown;
};
type TooltipProps = {
  active?: boolean;
  payload?: readonly TooltipItem[];
  label?: unknown;
};

/** Khung tooltip chung: tiêu đề + từng dòng (chấm màu, tên, số). */
function ChartTooltip({
  active,
  payload,
  label,
  title,
}: TooltipProps & { title: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-40 rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="mb-1 font-medium">{title || String(label ?? "")}</p>
      {payload.map((item) => (
        <div
          key={String(item.dataKey)}
          className="flex items-center gap-2 py-0.5"
        >
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ background: item.color }}
          />
          <span className="text-muted-foreground">{item.name}</span>
          <span className="ml-auto pl-3 font-medium tabular-nums">
            {formatNumber(Number(item.value ?? 0))}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Biểu đồ đường theo ngày: người dùng mới, tin mới, giao dịch. */
export function DailyChart({ daily }: { daily: DailyStat[] }) {
  return (
    <div className="admin-viz">
      <ul
        className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"
        aria-label="Chú thích"
      >
        {DAILY_SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-4 rounded-full"
              style={{ background: s.color }}
            />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={daily}
            margin={{ top: 8, right: 16, bottom: 0, left: -8 }}
          >
            <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
            <XAxis
              dataKey="date"
              tickFormatter={shortDay}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: "var(--viz-axis)" }}
              minTickGap={24}
            />
            <YAxis
              allowDecimals={false}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              cursor={{ stroke: "var(--viz-axis)", strokeWidth: 1 }}
              content={(props) => (
                <ChartTooltip
                  {...(props as TooltipProps)}
                  title={fullDay(String(props.label ?? ""))}
                />
              )}
            />
            {DAILY_SERIES.map((s) => (
              <Line
                key={s.key}
                type="linear"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  strokeWidth: 2,
                  stroke: "var(--background)",
                }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Cột ngang cho 1 số liệu theo danh mục chính (mỗi biểu đồ 1 số liệu, nhãn số ở đầu cột). */
export function CategoryBarChart({
  data,
  dataKey,
  label,
  color,
}: {
  data: CategoryStat[];
  dataKey: "active_listings" | "transactions";
  label: string;
  color: string;
}) {
  return (
    <div
      className="admin-viz w-full"
      style={{ height: Math.max(160, data.length * 40 + 24) }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 40, bottom: 0, left: 0 }}
          barCategoryGap={8}
        >
          <CartesianGrid horizontal={false} stroke="var(--viz-grid)" />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ ...AXIS_TICK, fill: "var(--foreground)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--viz-axis)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={(props) => (
              <ChartTooltip
                {...(props as TooltipProps)}
                title={String(props.label ?? "")}
              />
            )}
          />
          <Bar
            dataKey={dataKey}
            name={label}
            fill={color}
            radius={[0, 4, 4, 0]}
            maxBarSize={20}
            isAnimationActive={false}
          >
            <LabelList
              dataKey={dataKey}
              position="right"
              formatter={(v: unknown) => formatNumber(Number(v ?? 0))}
              style={{ fill: "var(--foreground)", fontSize: 12 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
