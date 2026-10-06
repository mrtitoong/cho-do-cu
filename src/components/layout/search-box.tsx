"use client";

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

const inputProps = {
  type: "search",
  name: "q",
  placeholder: "Tìm xe, điện thoại, phòng trọ...",
  "aria-label": "Tìm kiếm tin đăng",
  maxLength: 100,
  className: "h-10 rounded-full pl-9",
} as const;

/** Ô tìm kiếm trên thanh đầu trang: đặt từ khóa (?q=) cho trang chủ, giữ các bộ lọc khác. */
function SearchForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const onHome = pathname === "/";
  const current = onHome ? (searchParams.get("q") ?? "") : "";

  return (
    <form
      role="search"
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault();
        const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
        const params = new URLSearchParams(onHome ? searchParams.toString() : "");
        if (q) params.set("q", q);
        else params.delete("q");
        const qs = params.toString();
        router.push(qs ? `/?${qs}` : "/");
        (document.activeElement as HTMLElement | null)?.blur(); // ẩn bàn phím trên điện thoại
      }}
    >
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      {/* key: đổi từ khóa trên URL (Back, Xóa lọc) thì ô nhập cập nhật theo */}
      <Input key={current} defaultValue={current} {...inputProps} />
    </form>
  );
}

export function SearchBox() {
  return (
    <Suspense
      fallback={
        <div className="relative w-full">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input {...inputProps} disabled />
        </div>
      }
    >
      <SearchForm />
    </Suspense>
  );
}
