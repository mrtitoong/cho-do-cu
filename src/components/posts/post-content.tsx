import { cn } from "@/lib/utils";

/** Khung hiển thị HTML bài viết. CHỈ truyền HTML đã lọc bằng renderPostHtml(). */
export function PostContent({ html, className }: { html: string; className?: string }) {
  return <div className={cn("post-content", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
