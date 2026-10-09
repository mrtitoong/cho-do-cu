"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PostImage } from "@/components/posts/post-image";
import { Button } from "@/components/ui/button";
import { uploadPostImage } from "./upload-post-image";

type Props = {
  value: string | null;
  onChange: (path: string | null) => void;
};

/**
 * Chọn ảnh bìa: nén rồi upload ngay vào post-images/covers. Ảnh bìa cũ chỉ bị xóa khỏi Storage
 * khi bài được lưu với ảnh mới (Server Action savePost), để Hủy/không lưu thì bài cũ vẫn còn ảnh.
 */
export function CoverPicker({ value, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      onChange(await uploadPostImage(file, "covers"));
    } catch (error) {
      console.error("CoverPicker:", error);
      toast.error("Không tải được ảnh bìa lên, vui lòng thử lại.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <PostImage path={value} sizes="400px" className="aspect-[16/9] w-full rounded-lg border" />
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted/50"
        >
          {uploading ? <Loader2 className="size-6 animate-spin" /> : <ImagePlus className="size-6" />}
          {uploading ? "Đang tải ảnh lên..." : "Chọn ảnh bìa (tỉ lệ 16:9)"}
        </button>
      )}
      {value && (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} Đổi ảnh
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            className="text-destructive hover:text-destructive"
            onClick={() => onChange(null)}
          >
            <Trash2 /> Bỏ ảnh bìa
          </Button>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void pick(e.target.files?.[0])}
      />
    </div>
  );
}
