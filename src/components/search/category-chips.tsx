"use client";

import { LayoutGrid } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import type { CategoryTree } from "@/lib/category-tree";
import { cn } from "@/lib/utils";

type Props = {
  categories: CategoryTree;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
};

const chipClass =
  "flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors";

/** Thanh chip danh mục chính, cuộn ngang trên điện thoại. */
export function CategoryChips({ categories, value, onChange }: Props) {
  return (
    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="radiogroup" aria-label="Danh mục">
      <button
        type="button"
        role="radio"
        aria-checked={!value}
        onClick={() => onChange(undefined)}
        className={cn(chipClass, !value ? "border-foreground bg-foreground text-background" : "bg-background hover:bg-muted")}
      >
        <LayoutGrid className="size-4" /> Tất cả
      </button>
      {categories.map(({ slug, name, icon, color }) => {
        const active = value === slug;
        return (
          <button
            key={slug}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? undefined : slug)}
            className={cn(chipClass, active ? "text-white" : "bg-background hover:bg-muted")}
            style={active ? { backgroundColor: color, borderColor: color } : undefined}
          >
            <CategoryIcon name={icon} className="size-4" style={active ? undefined : { color }} />
            {name}
          </button>
        );
      })}
    </div>
  );
}
