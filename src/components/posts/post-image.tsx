import Image from "next/image";
import { postImageUrl } from "@/lib/posts";
import { cn } from "@/lib/utils";

type Props = {
  /** Đường dẫn ảnh trong bucket post-images */
  path: string;
  sizes: string;
  alt?: string;
  /** Lớp CSS của khung bọc (đặt kích thước ở đây) */
  className?: string;
  preload?: boolean;
};

/** Ảnh tin tức từ Supabase Storage, qua next/image. */
export function PostImage({ path, sizes, alt = "", className, preload }: Props) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <Image src={postImageUrl(path)} alt={alt} fill sizes={sizes} preload={preload} className="object-cover" />
    </div>
  );
}
