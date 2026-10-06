"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { getMainCategory, MAIN_CATEGORIES, type MainCategorySlug } from "@/config/categories";

type Props = {
  mainSlug: MainCategorySlug | null;
  subSlug: string | null;
  onMainChange: (slug: MainCategorySlug) => void;
  onSubChange: (slug: string) => void;
};

export function StepCategory({ mainSlug, subSlug, onMainChange, onSubChange }: Props) {
  const main = mainSlug ? getMainCategory(mainSlug) : undefined;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 font-semibold">Chọn danh mục chính</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {MAIN_CATEGORIES.map((m) => {
            const active = m.slug === mainSlug;
            return (
              <button
                key={m.slug}
                type="button"
                onClick={() => onMainChange(m.slug)}
                aria-pressed={active}
                className={cn(
                  "flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center text-sm font-medium transition-colors",
                  "hover:border-primary/50 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active && "border-primary bg-primary/5 ring-1 ring-primary",
                )}
              >
                <m.icon className="size-10" strokeWidth={1.5} />
                {m.name}
              </button>
            );
          })}
        </div>
      </section>

      {main && (
        <section>
          <h2 className="mb-3 font-semibold">Chọn danh mục con của &quot;{main.name}&quot;</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {main.subcategories.map((s) => {
              const active = s.slug === subSlug;
              return (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => onSubChange(s.slug)}
                  aria-pressed={active}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-lg border px-4 text-left text-sm transition-colors",
                    "hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    active && "border-primary bg-primary/5 font-medium",
                  )}
                >
                  <s.icon className="size-5 shrink-0 text-muted-foreground" />
                  <span className="flex-1">{s.name}</span>
                  {active && <Check className="size-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
