"use client";

import { useState } from "react";
import { CATEGORY_ICON_NAMES, CategoryIcon } from "@/components/category-icon";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Chọn icon danh mục trong bộ icon lucide-react đã khai báo ở src/components/category-icon.tsx. */
export function IconPicker({ id, value, onChange }: { id?: string; value: string; onChange: (icon: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const names = q ? CATEGORY_ICON_NAMES.filter((n) => n.includes(q)) : CATEGORY_ICON_NAMES;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button id={id} type="button" variant="outline" className="h-10 justify-start">
          <CategoryIcon name={value} />
          <span className="font-mono text-xs">{value || "Chọn icon"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Chọn icon</DialogTitle>
        </DialogHeader>
        <Input placeholder="Tìm theo tên tiếng Anh (car, house...)" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="grid max-h-80 grid-cols-6 gap-1 overflow-y-auto sm:grid-cols-8">
          {names.map((name) => (
            <button
              key={name}
              type="button"
              title={name}
              aria-label={name}
              aria-pressed={name === value}
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg border hover:bg-muted",
                name === value && "border-primary bg-primary/10 text-primary",
              )}
            >
              <CategoryIcon name={name} className="size-5" />
            </button>
          ))}
          {names.length === 0 && <p className="col-span-full py-6 text-center text-sm text-muted-foreground">Không có icon phù hợp.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
