import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

// Ô tìm kiếm: chưa xử lý tìm kiếm ở giai đoạn này.
export function SearchBox() {
  return (
    <div role="search" className="relative w-full">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Tìm xe, điện thoại, phòng trọ..."
        aria-label="Tìm kiếm tin đăng"
        className="h-10 rounded-full pl-9"
      />
    </div>
  );
}
