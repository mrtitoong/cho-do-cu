"use client";

import { PostContent } from "@/components/posts/post-content";
import { PostImage } from "@/components/posts/post-image";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type PostPreview = {
  title: string;
  excerpt: string;
  coverPath: string | null;
  /** HTML đã lọc bởi renderPostHtml() trên server */
  html: string;
};

/** Xem trước bài đúng như trang /tin-tuc/[slug] (cùng hàm xuất HTML và cùng CSS). */
export function PostPreviewDialog({ preview, onClose }: { preview: PostPreview | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(preview)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogDescription>Xem trước – bài chưa lưu cũng hiển thị đúng như trên trang</DialogDescription>
          <DialogTitle className="text-2xl leading-tight font-bold">
            {preview?.title || "(Chưa có tiêu đề)"}
          </DialogTitle>
        </DialogHeader>
        {preview && (
          <article className="space-y-6">
            {preview.excerpt && <p className="text-lg text-muted-foreground">{preview.excerpt}</p>}
            {preview.coverPath && (
              <PostImage path={preview.coverPath} sizes="768px" className="aspect-[16/9] rounded-xl" />
            )}
            {preview.html ? (
              <PostContent html={preview.html} />
            ) : (
              <p className="text-muted-foreground">Bài chưa có nội dung.</p>
            )}
          </article>
        )}
      </DialogContent>
    </Dialog>
  );
}
