import Link from "next/link";
import { CategoryIcon } from "@/components/category-icon";
import type { CategoryTree } from "@/lib/category-tree";
import { formatNumber } from "@/lib/format";

type Props = {
  categories: CategoryTree;
  /** id danh mục chính → số tin đang bán (thiếu thì không hiện số) */
  counts: Record<number, number> | null;
};

/** Danh mục chính: lưới trên máy tính, dải cuộn ngang trên điện thoại. */
export function CategoryGrid({ categories, counts }: Props) {
  return (
    <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5 [&::-webkit-scrollbar]:hidden">
      {categories.map((c) => (
        <li key={c.id} className="w-28 shrink-0 snap-start sm:w-auto">
          <Link
            href={`/tim-kiem?dm=${encodeURIComponent(c.slug)}`}
            className="flex h-full flex-col items-center gap-2 rounded-xl border bg-background p-3 text-center transition-shadow hover:shadow-md sm:p-4"
          >
            <span
              className="flex size-12 items-center justify-center rounded-full sm:size-14"
              style={{ backgroundColor: `${c.color}1a`, color: c.color }}
            >
              <CategoryIcon name={c.icon} className="size-6 sm:size-7" />
            </span>
            <span className="text-sm font-medium leading-tight">{c.name}</span>
            {counts && (
              <span className="text-xs text-muted-foreground">{formatNumber(counts[c.id] ?? 0)} tin</span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
