import Image from "next/image";
import { listingImageUrl } from "@/lib/listing-images";
import { cn } from "@/lib/utils";

type Props = {
  /** Đường dẫn ảnh trong bucket listing-images */
  path: string;
  /** Chiều rộng hiển thị (thuộc tính sizes của next/image), VD "96px" hoặc "(min-width: 768px) 60vw, 100vw" */
  sizes: string;
  alt?: string;
  /** Lớp CSS của khung bọc (đặt kích thước ở đây) */
  className?: string;
  /** Lớp CSS của thẻ ảnh, mặc định object-cover */
  imgClassName?: string;
  /** Ảnh quan trọng cần tải sớm (ảnh đầu tiên của trang) */
  preload?: boolean;
};

/** Ảnh tin đăng từ Supabase Storage, qua next/image để tự đổi kích thước và định dạng. */
export function ListingImage({ path, sizes, alt = "", className, imgClassName, preload }: Props) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <Image
        src={listingImageUrl(path)}
        alt={alt}
        fill
        sizes={sizes}
        preload={preload}
        draggable={false}
        className={cn("object-cover", imgClassName)}
      />
    </div>
  );
}
