"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type DailyStat, dailyToCsv } from "@/lib/admin-stats";

/** Tải số liệu theo ngày (đang hiển thị) về máy dạng CSV. */
export function ExportCsvButton({ daily, from, to }: { daily: DailyStat[]; from: string; to: string }) {
  const download = () => {
    const blob = new Blob([dailyToCsv(daily)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thong-ke-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button type="button" variant="outline" className="h-10" onClick={download} disabled={!daily.length}>
      <Download /> Xuất CSV
    </Button>
  );
}
