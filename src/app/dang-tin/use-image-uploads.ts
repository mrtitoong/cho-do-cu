"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { LISTING_IMAGES_BUCKET, listingImageFolder, listingImageUrl, MAX_LISTING_IMAGES } from "@/lib/listing-images";
import { compressImage, uploadWithProgress } from "./image-upload";

export type UploadStatus = "compressing" | "uploading" | "done" | "error";

export type UploadItem = {
  id: string;
  /** File gốc người dùng chọn; không có với ảnh đã lưu từ trước (trang sửa tin) */
  file?: File;
  /** URL xem trước: blob: với ảnh mới chọn, URL công khai với ảnh đã lưu */
  previewUrl: string;
  /** Ảnh đã lưu của tin đang sửa: bỏ ở form thì chưa xóa file ngay, server dọn khi lưu thay đổi */
  existing?: boolean;
  /** Ảnh đã nén, giữ lại để upload lại khi cần */
  blob?: Blob;
  ext?: "webp" | "jpg";
  status: UploadStatus;
  progress: number;
  /** Đường dẫn trong Storage, có khi đã upload xong */
  path?: string;
  error?: string;
};

const isAbort = (e: unknown) => e instanceof DOMException && e.name === "AbortError";
const revokePreview = (item: UploadItem) => {
  if (item.previewUrl.startsWith("blob:")) URL.revokeObjectURL(item.previewUrl);
};

/**
 * Quản lý ảnh của tin đang đăng: nén → upload vào {user_id}/{listing_id}/{uuid}.webp,
 * theo dõi tiến trình từng ảnh, xóa, thử lại, sắp xếp.
 * `initialPaths`: ảnh đã lưu của tin đang sửa.
 */
export function useImageUploads(userId: string, listingId: string, initialPaths: string[] = []) {
  const [items, setItems] = useState<UploadItem[]>(() =>
    initialPaths.map((path) => ({
      id: path,
      previewUrl: listingImageUrl(path),
      existing: true,
      status: "done",
      progress: 100,
      path,
    })),
  );
  const supabase = useMemo(() => createClient(), []);
  const aborts = useRef(new Map<string, () => void>());
  const removed = useRef(new Set<string>());
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Rời trang: hủy upload đang chạy, giải phóng URL xem trước
  useEffect(() => {
    const pending = aborts.current;
    return () => {
      pending.forEach((abort) => abort());
      itemsRef.current.forEach(revokePreview);
    };
  }, []);

  function patch(id: string, changes: Partial<UploadItem>) {
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...changes } : it)));
  }

  async function process(item: Pick<UploadItem, "id" | "file" | "blob" | "ext">) {
    const { id } = item;
    try {
      let { blob, ext } = item;
      if (!blob || !ext) {
        if (!item.file) return; // ảnh đã lưu từ trước, không cần upload
        patch(id, { status: "compressing", progress: 0, error: undefined });
        ({ blob, ext } = await compressImage(item.file));
        if (removed.current.has(id)) return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Phiên đăng nhập đã hết, vui lòng đăng nhập lại");

      const path = `${listingImageFolder(userId, listingId)}/${crypto.randomUUID()}.${ext}`;
      patch(id, { blob, ext, status: "uploading", progress: 0, path: undefined, error: undefined });

      const upload = uploadWithProgress(path, blob, session.access_token, (progress) => patch(id, { progress }));
      aborts.current.set(id, upload.abort);
      await upload.promise;
      aborts.current.delete(id);

      patch(id, { status: "done", progress: 100, path });
    } catch (e) {
      aborts.current.delete(id);
      if (isAbort(e) || removed.current.has(id)) return;
      console.error("Upload ảnh:", e);
      const message = e instanceof Error && e.message ? e.message : "Không tải được ảnh";
      patch(id, { status: "error", error: message });
    }
  }

  function add(files: FileList | File[]) {
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (images.length < files.length) toast.warning("Chỉ chọn được file ảnh.");

    const room = MAX_LISTING_IMAGES - items.length;
    if (images.length > room) toast.warning(`Mỗi tin tối đa ${MAX_LISTING_IMAGES} ảnh.`);

    const added: UploadItem[] = images.slice(0, Math.max(room, 0)).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "compressing",
      progress: 0,
    }));
    if (!added.length) return;

    setItems((list) => [...list, ...added]);
    added.forEach(process);
  }

  function remove(id: string) {
    const item = items.find((it) => it.id === id);
    if (!item) return;
    removed.current.add(id);
    aborts.current.get(id)?.();
    revokePreview(item);
    setItems((list) => list.filter((it) => it.id !== id));
    // Xóa file vừa upload; lỡ lỗi thì file thừa sẽ được dọn khi đăng/lưu tin.
    // Ảnh đã lưu từ trước thì giữ file đến khi bấm lưu (người dùng có thể bỏ dở việc sửa).
    if (item.path && !item.existing) void supabase.storage.from(LISTING_IMAGES_BUCKET).remove([item.path]);
  }

  function retry(id: string) {
    const item = items.find((it) => it.id === id);
    if (item) void process(item);
  }

  function reorder(activeId: string, overId: string) {
    setItems((list) => {
      const from = list.findIndex((it) => it.id === activeId);
      const to = list.findIndex((it) => it.id === overId);
      return from < 0 || to < 0 ? list : arrayMove(list, from, to);
    });
  }

  /** Upload lại toàn bộ ảnh (server đã xóa file sau khi đăng tin lỗi). Ảnh nén sẵn nên không phải nén lại. */
  function reuploadAll() {
    setItems((list) => list.map((it) => (it.existing ? it : { ...it, path: undefined })));
    items.forEach((it) => void process(it));
  }

  const busy = items.some((it) => it.status === "compressing" || it.status === "uploading");
  const failed = items.some((it) => it.status === "error");
  const paths = items.flatMap((it) => (it.status === "done" && it.path ? [it.path] : []));

  return { items, add, remove, retry, reorder, reuploadAll, busy, failed, paths };
}

export type ImageUploads = ReturnType<typeof useImageUploads>;
