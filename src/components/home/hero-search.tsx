"use client";

import { useRouter } from "next/navigation";
import { LocateFixed, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  categories: { slug: string; name: string }[];
};

/** Ô tìm kiếm lớn ở đầu trang chủ: từ khóa + danh mục → /tim-kiem?q=...&dm=... */
export function HeroSearch({ categories }: Props) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-2">
      <form
        role="search"
        className="flex flex-col gap-2 rounded-2xl bg-background p-2 shadow-lg sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          const params = new URLSearchParams();
          const q = String(form.get("q") ?? "").trim();
          const dm = String(form.get("dm") ?? "");
          if (q) params.set("q", q);
          if (dm) params.set("dm", dm);
          const qs = params.toString();
          router.push(qs ? `/tim-kiem?${qs}` : "/tim-kiem");
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            name="q"
            maxLength={100}
            placeholder="Bạn muốn tìm gì?"
            aria-label="Từ khóa"
            className="h-12 border-0 pl-10 text-base shadow-none focus-visible:ring-0 md:text-base"
          />
        </div>
        <select
          name="dm"
          aria-label="Danh mục"
          defaultValue=""
          className="h-12 rounded-lg border bg-background px-3 text-base sm:w-48 sm:border-0 sm:border-l sm:rounded-none"
        >
          <option value="">Tất cả danh mục</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        <Button type="submit" className="h-12 px-6 text-base">
          <Search /> Tìm kiếm
        </Button>
      </form>
      {/* /tim-kiem không có toạ độ trên URL sẽ tự xin vị trí và tìm quanh người dùng */}
      <Button
        variant="secondary"
        className="h-11 self-center rounded-full"
        onClick={() => router.push("/tim-kiem")}
      >
        <LocateFixed /> Tìm quanh tôi
      </Button>
    </div>
  );
}
