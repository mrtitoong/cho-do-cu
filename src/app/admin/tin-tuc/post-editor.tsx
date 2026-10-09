"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { JSONContent } from "@tiptap/react";
import { ArrowLeft, Eye, EyeOff, ExternalLink, Loader2, Save, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";
import {
  EMPTY_POST_CONTENT,
  POST_STATUS_LABEL,
  postInputSchema,
  postSlugFromTitle,
  type PostInput,
  type PostStatus,
} from "@/lib/posts";
import { deletePost, previewPost, savePost } from "./actions";
import { ConfirmButton } from "./confirm-button";
import { CoverPicker } from "./cover-picker";
import { PostPreviewDialog, type PostPreview } from "./post-preview-dialog";
import { RichTextEditor } from "./rich-text-editor";

const AUTOSAVE_MS = 30_000;

export type EditablePost = PostInput & {
  id: string;
  status: PostStatus;
  publishedAt: string | null;
};

type SaveState =
  { kind: "idle" } | { kind: "saving" } | { kind: "saved"; at: Date } | { kind: "error"; message: string };

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

/** Form soạn bài: dùng cho cả viết bài mới (post = null) lẫn sửa bài. */
export function PostEditor({ post }: { post: EditablePost | null }) {
  const router = useRouter();
  const [postId, setPostId] = useState(post?.id ?? null);
  const [status, setStatus] = useState<PostStatus>(post?.status ?? "draft");
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [preview, setPreview] = useState<PostPreview | null>(null);
  const [pending, startTransition] = useTransition();
  // Bài mới: slug tự sinh theo tiêu đề cho đến khi admin tự sửa. Bài cũ: giữ nguyên slug (link đã chia sẻ).
  const [slugTouched, setSlugTouched] = useState(Boolean(post));
  // Đếm số lần sửa để biết còn thay đổi chưa lưu không (kể cả khi đang lưu dở).
  const version = useRef(0);
  const savedVersion = useRef(0);
  const saving = useRef(false);

  const form = useForm<PostInput>({
    resolver: zodResolver(postInputSchema),
    defaultValues: post
      ? {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          coverPath: post.coverPath,
          isFeatured: post.isFeatured,
          content: post.content,
        }
      : {
          title: "",
          slug: "",
          excerpt: "",
          coverPath: null,
          isFeatured: false,
          content: EMPTY_POST_CONTENT,
        },
  });
  const { register, setValue, getValues, formState, control } = form;
  const [slug, coverPath, isFeatured] = useWatch({
    control,
    name: ["slug", "coverPath", "isFeatured"],
  });
  const { isSubmitted } = formState;

  useEffect(
    () =>
      form.subscribe({
        formState: { values: true },
        callback: ({ name, values }) => {
          version.current++;
          if (name === "title" && !slugTouched) {
            setValue("slug", postSlugFromTitle(values.title), {
              shouldValidate: isSubmitted,
            });
          }
        },
      }),
    [form, setValue, slugTouched, isSubmitted],
  );

  /** Lưu với trạng thái `next`. Trả về true nếu thành công. */
  const save = useCallback(
    async (next: PostStatus, autosave = false) => {
      if (saving.current) return false;
      saving.current = true;
      const startedAt = version.current;
      setSaveState({ kind: "saving" });
      try {
        const result = await savePost(postId, getValues(), {
          status: next,
          autosave,
        });
        if (!result.ok) {
          setSaveState({ kind: "error", message: result.error });
          if (!autosave) toast.error(result.error);
          return false;
        }
        savedVersion.current = startedAt;
        setStatus(next);
        setSaveState({ kind: "saved", at: new Date() });
        if (!postId) {
          setPostId(result.id);
          // Đổi URL sang trang sửa mà không tải lại (giữ nguyên trình soạn đang mở)
          window.history.replaceState(null, "", `/admin/tin-tuc/${result.id}`);
        }
        return true;
      } catch (error) {
        console.error("PostEditor.save:", error);
        setSaveState({ kind: "error", message: "Mất kết nối, chưa lưu được." });
        if (!autosave) toast.error("Mất kết nối, chưa lưu được bài viết.");
        return false;
      } finally {
        saving.current = false;
      }
    },
    [postId, getValues],
  );

  // Tự lưu nháp mỗi 30 giây khi có thay đổi. Bài đã đăng không tự lưu (tránh sửa dở hiện ngay ra ngoài).
  useEffect(() => {
    if (status !== "draft") return;
    const timer = setInterval(() => {
      if (version.current === savedVersion.current) return;
      if (!postInputSchema.safeParse(getValues()).success) return; // thiếu tiêu đề/slug thì chờ
      void save("draft", true);
    }, AUTOSAVE_MS);
    return () => clearInterval(timer);
  }, [status, save, getValues]);

  // Cảnh báo khi rời trang mà còn thay đổi chưa lưu
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (version.current !== savedVersion.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const submit = (next: PostStatus, message: string) =>
    form.handleSubmit(async () => {
      if (next === "published" && !getValues("excerpt").trim()) {
        form.setError("excerpt", {
          message: "Vui lòng nhập mô tả ngắn trước khi đăng bài.",
        });
        return;
      }
      if (await save(next)) {
        toast.success(message);
        router.refresh();
      }
    })();

  function openPreview() {
    startTransition(async () => {
      const v = getValues();
      const result = await previewPost(v.content);
      if (!result.ok) return void toast.error(result.error);
      setPreview({
        title: v.title,
        excerpt: v.excerpt,
        coverPath: v.coverPath,
        html: result.html,
      });
    });
  }

  async function remove() {
    if (!postId) return;
    const result = await deletePost(postId);
    if (!result.ok) return void toast.error(result.error);
    savedVersion.current = version.current;
    toast.success("Đã xóa bài viết");
    router.push("/admin/tin-tuc");
  }

  const busy = saveState.kind === "saving" || formState.isSubmitting;
  const published = status === "published";
  const { errors } = formState;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" className="h-10 px-2">
          <Link href="/admin/tin-tuc">
            <ArrowLeft /> Danh sách bài
          </Link>
        </Button>
        <Badge variant={published ? "default" : "outline"}>{POST_STATUS_LABEL[status]}</Badge>
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {saveState.kind === "saving" && "Đang lưu..."}
          {saveState.kind === "saved" && `Đã lưu lúc ${saveState.at.toLocaleTimeString("vi-VN")}`}
          {saveState.kind === "error" && <span className="text-destructive">{saveState.message}</span>}
          {saveState.kind === "idle" && !published && "Tự lưu nháp mỗi 30 giây"}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* Cột chính: tiêu đề + nội dung */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="post-title">Tiêu đề</Label>
            <Input
              id="post-title"
              {...register("title")}
              placeholder="Tiêu đề bài viết"
              className="h-12 text-lg font-semibold"
            />
            <FieldError message={errors.title?.message} />
          </div>
          <RichTextEditor
            initialContent={getValues("content") as JSONContent}
            onChange={(content) => setValue("content", content as PostInput["content"])}
          />
        </div>

        {/* Cột phụ: thao tác + thông tin bài */}
        <aside className="space-y-4">
          <div className="space-y-2 rounded-xl border bg-background p-4">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" disabled={pending} onClick={openPreview}>
                {pending ? <Loader2 className="animate-spin" /> : <Eye />} Xem trước
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => submit(status, published ? "Đã cập nhật bài viết" : "Đã lưu nháp")}
              >
                <Save /> {published ? "Cập nhật" : "Lưu nháp"}
              </Button>
            </div>
            {published ? (
              <ConfirmButton
                title="Gỡ bài này?"
                description="Bài sẽ chuyển về Nháp và không còn hiển thị ở trang Tin tức và trang chủ."
                confirmLabel="Gỡ bài"
                disabled={busy}
                onConfirm={() => submit("draft", "Đã gỡ bài, bài chuyển về Nháp")}
              >
                <EyeOff /> Gỡ bài
              </ConfirmButton>
            ) : (
              <Button
                type="button"
                className="w-full"
                disabled={busy}
                onClick={() => submit("published", "Đã đăng bài")}
              >
                {busy ? <Loader2 className="animate-spin" /> : <Send />} Đăng bài
              </Button>
            )}
            {published && postId && (
              <Button asChild variant="link" className="w-full">
                <a href={`/tin-tuc/${slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink /> Xem trên trang
                </a>
              </Button>
            )}
            {post?.publishedAt && (
              <p className="text-center text-xs text-muted-foreground">
                Đăng lần đầu: {formatDateTime(post.publishedAt)}
              </p>
            )}
          </div>

          <div className="space-y-4 rounded-xl border bg-background p-4">
            <div className="space-y-1.5">
              <Label htmlFor="post-slug">Đường dẫn (slug)</Label>
              <Input
                id="post-slug"
                {...register("slug", { onChange: () => setSlugTouched(true) })}
                placeholder="tu-sinh-theo-tieu-de"
                className="h-10 font-mono text-sm"
              />
              <p className="text-xs break-all text-muted-foreground">/tin-tuc/{slug || "..."}</p>
              {published && (
                <p className="text-xs text-amber-600">Đổi slug của bài đã đăng sẽ làm hỏng link đã chia sẻ.</p>
              )}
              <FieldError message={errors.slug?.message} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="post-excerpt">Mô tả ngắn</Label>
              <Textarea
                id="post-excerpt"
                {...register("excerpt")}
                rows={4}
                maxLength={500}
                placeholder="1–2 câu tóm tắt, hiện ở danh sách bài và khi chia sẻ link"
              />
              <FieldError message={errors.excerpt?.message} />
            </div>

            <div className="space-y-1.5">
              <Label>Ảnh bìa</Label>
              <CoverPicker value={coverPath} onChange={(path) => setValue("coverPath", path)} />
            </div>

            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={isFeatured}
                onCheckedChange={(v) => setValue("isFeatured", v === true)}
              />
              <span>
                <span className="font-medium">Nổi bật</span>
                <span className="block text-muted-foreground">Ưu tiên hiện ở trang chủ.</span>
              </span>
            </label>
          </div>

          {postId && (
            <ConfirmButton
              variant="ghost"
              className="w-full text-destructive hover:text-destructive"
              title="Xóa hẳn bài viết?"
              description="Bài viết và ảnh trong bài sẽ bị xóa vĩnh viễn, không khôi phục được. Muốn tạm ẩn thì dùng Gỡ bài."
              confirmLabel="Xóa bài"
              onConfirm={remove}
            >
              <Trash2 /> Xóa bài viết
            </ConfirmButton>
          )}
        </aside>
      </div>

      <PostPreviewDialog preview={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
