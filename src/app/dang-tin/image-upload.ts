import imageCompression from "browser-image-compression";
import { LISTING_IMAGES_BUCKET } from "@/lib/listing-images";

const COMPRESS_OPTIONS = {
  maxWidthOrHeight: 1600,
  maxSizeMB: 0.48, // chừa chút dư để chắc chắn dưới 500 KB
  useWebWorker: true,
  initialQuality: 0.85,
};

/**
 * Nén ảnh trên trình duyệt: cạnh dài tối đa 1600px, WebP, dưới 500 KB.
 * Trình duyệt cũ không xuất được WebP (canvas trả về PNG) thì nén sang JPEG.
 */
export async function compressImage(file: File): Promise<{ blob: Blob; ext: "webp" | "jpg" }> {
  if (!file.type.startsWith("image/")) throw new Error("File không phải ảnh");

  const webp = await imageCompression(file, { ...COMPRESS_OPTIONS, fileType: "image/webp" });
  if (webp.type === "image/webp") return { blob: webp, ext: "webp" };

  const jpeg = await imageCompression(file, { ...COMPRESS_OPTIONS, fileType: "image/jpeg" });
  return { blob: jpeg, ext: "jpg" };
}

export type UploadHandle = { promise: Promise<void>; abort: () => void };

/**
 * Upload một file vào bucket listing-images qua Storage REST API.
 * Dùng XMLHttpRequest thay cho supabase-js vì cần sự kiện tiến trình upload.
 */
export function uploadWithProgress(
  path: string,
  blob: Blob,
  accessToken: string,
  onProgress: (percent: number) => void,
): UploadHandle {
  const xhr = new XMLHttpRequest();
  const encoded = path.split("/").map(encodeURIComponent).join("/");

  const promise = new Promise<void>((resolve, reject) => {
    xhr.open("POST", `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${LISTING_IMAGES_BUCKET}/${encoded}`);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
    xhr.setRequestHeader("Content-Type", blob.type);
    xhr.setRequestHeader("Cache-Control", "max-age=31536000"); // tên file là uuid, không bao giờ đổi nội dung
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload lỗi (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Mất kết nối khi tải ảnh lên"));
    xhr.onabort = () => reject(new DOMException("Đã hủy", "AbortError"));
    xhr.send(blob);
  });

  return { promise, abort: () => xhr.abort() };
}
