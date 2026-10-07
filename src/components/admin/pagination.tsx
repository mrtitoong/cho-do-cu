import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

type Props = {
  basePath: string;
  /** searchParams hiện tại (giữ nguyên bộ lọc khi chuyển trang) */
  params: Record<string, string | undefined>;
  page: number;
  pageSize: number;
  total: number;
};

/** Phân trang phía server: link "Trước / Sau" giữ nguyên bộ lọc trên URL. */
export function Pagination({ basePath, params, page, pageSize, total }: Props) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v && k !== "trang") qs.set(k, v);
    if (p > 1) qs.set("trang", String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>
        {formatNumber(from)}–{formatNumber(to)} / {formatNumber(total)} dòng
      </span>
      <div className="flex items-center gap-2">
        <span>
          Trang {page}/{pageCount}
        </span>
        {page > 1 ? (
          <Button asChild variant="outline" size="icon" aria-label="Trang trước">
            <Link href={href(page - 1)}>
              <ChevronLeft />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="icon" disabled aria-label="Trang trước">
            <ChevronLeft />
          </Button>
        )}
        {page < pageCount ? (
          <Button asChild variant="outline" size="icon" aria-label="Trang sau">
            <Link href={href(page + 1)}>
              <ChevronRight />
            </Link>
          </Button>
        ) : (
          <Button variant="outline" size="icon" disabled aria-label="Trang sau">
            <ChevronRight />
          </Button>
        )}
      </div>
    </div>
  );
}
