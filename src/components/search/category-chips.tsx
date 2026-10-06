"use client";

import { LayoutGrid } from "lucide-react";
import { MAIN_CATEGORIES, type MainCategorySlug } from "@/config/categories";
import { cn } from "@/lib/utils";

type Props = {
  value: MainCategorySlug | undefined;
  onChange: (value: MainCategorySlug | undefined) => void;
};

const chipClass =
  "flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-colors";

/** Thanh chip danh mục chính, cuộn ngang trên điện thoại. */
export function CategoryChips({ value, onChange }: Props) {
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
      {MAIN_CATEGORIES.map(({ slug, name, icon: Icon, color }) => {
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
            <Icon className="size-4" style={active ? undefined : { color }} />
            {name}
          </button>
        );
      })}
    </div>
  );
}
