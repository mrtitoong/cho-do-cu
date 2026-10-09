"use client";

import { useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor, type JSONContent } from "@tiptap/react";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Redo2,
  Undo2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postExtensions } from "@/lib/post-extensions";
import { postImageUrl } from "@/lib/posts";
import { cn } from "@/lib/utils";
import { uploadPostImage } from "./upload-post-image";

function ToolbarButton({
  icon: Icon,
  label,
  active,
  disabled,
  spin,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  disabled?: boolean;
  spin?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn("size-9", active && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary")}
    >
      <Icon className={cn(spin && "animate-spin")} />
    </Button>
  );
}

/** Thêm https:// nếu người dùng gõ "example.com". */
function normalizeUrl(raw: string) {
  const url = raw.trim();
  if (!url) return "";
  return /^(https?:|mailto:|tel:)/i.test(url) ? url : `https://${url}`;
}

function LinkDialog({
  editor,
  open,
  onOpenChange,
}: {
  editor: Editor;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [url, setUrl] = useState("");

  function apply(e: React.FormEvent) {
    e.preventDefault();
    const href = normalizeUrl(url);
    const chain = editor.chain().focus().extendMarkRange("link");
    if (href) chain.setLink({ href }).run();
    else chain.unsetLink().run();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setUrl(editor.getAttributes("link").href ?? "");
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <form onSubmit={apply} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Chèn liên kết</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="link-url">Địa chỉ liên kết</Label>
            <Input
              id="link-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              autoFocus
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">Bôi đen chữ trước khi chèn. Để trống để bỏ liên kết.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Hủy
            </Button>
            <Button type="submit">Áp dụng</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const INITIAL_TOOLBAR_STATE = {
  bold: false,
  italic: false,
  h2: false,
  h3: false,
  bullet: false,
  ordered: false,
  quote: false,
  link: false,
  canUndo: false,
  canRedo: false,
};

type Props = {
  initialContent: JSONContent;
  onChange: (content: JSONContent) => void;
};

/** Trình soạn nội dung bài viết (Tiptap): đậm, nghiêng, tiêu đề, danh sách, link, ảnh, trích dẫn. */
export function RichTextEditor({ initialContent, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: postExtensions,
    content: initialContent,
    immediatelyRender: false, // tránh lệch HTML giữa server và trình duyệt
    editorProps: {
      attributes: {
        class: "post-content min-h-80 px-4 py-3 outline-none",
        "aria-label": "Nội dung bài viết",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
  });

  // Trạng thái nút trên thanh công cụ. Tiptap chỉ tính lại selector khi có giao dịch mới,
  // nên lúc editor vừa tạo xong state vẫn có thể là null → dùng giá trị mặc định, KHÔNG chờ state.
  const state =
    useEditorState({
      editor,
      selector: ({ editor: e }) =>
        e && {
          bold: e.isActive("bold"),
          italic: e.isActive("italic"),
          h2: e.isActive("heading", { level: 2 }),
          h3: e.isActive("heading", { level: 3 }),
          bullet: e.isActive("bulletList"),
          ordered: e.isActive("orderedList"),
          quote: e.isActive("blockquote"),
          link: e.isActive("link"),
          canUndo: e.can().undo(),
          canRedo: e.can().redo(),
        },
    }) ?? INITIAL_TOOLBAR_STATE;

  async function insertImages(files: FileList | null) {
    if (!editor || !files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = await uploadPostImage(file, "content");
        editor
          .chain()
          .focus()
          .setImage({ src: postImageUrl(path), alt: "" })
          .run();
      }
    } catch (error) {
      console.error("insertImages:", error);
      toast.error("Không tải được ảnh lên, vui lòng thử lại.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!editor) {
    return <div className="h-96 animate-pulse rounded-lg border bg-muted/50" />;
  }

  const chain = () => editor.chain().focus();

  return (
    <div className="rounded-lg border bg-background focus-within:ring-3 focus-within:ring-ring/50">
      <div
        role="toolbar"
        aria-label="Định dạng"
        className="sticky top-14 z-10 flex rounded-t-lg flex-wrap gap-0.5 border-b bg-background p-1"
      >
        <ToolbarButton
          icon={Bold}
          label="Đậm (Ctrl+B)"
          active={state.bold}
          onClick={() => chain().toggleBold().run()}
        />
        <ToolbarButton
          icon={Italic}
          label="Nghiêng (Ctrl+I)"
          active={state.italic}
          onClick={() => chain().toggleItalic().run()}
        />
        <span className="mx-1 w-px self-stretch bg-border" />
        <ToolbarButton
          icon={Heading2}
          label="Tiêu đề lớn"
          active={state.h2}
          onClick={() => chain().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          icon={Heading3}
          label="Tiêu đề nhỏ"
          active={state.h3}
          onClick={() => chain().toggleHeading({ level: 3 }).run()}
        />
        <span className="mx-1 w-px self-stretch bg-border" />
        <ToolbarButton
          icon={List}
          label="Danh sách"
          active={state.bullet}
          onClick={() => chain().toggleBulletList().run()}
        />
        <ToolbarButton
          icon={ListOrdered}
          label="Danh sách đánh số"
          active={state.ordered}
          onClick={() => chain().toggleOrderedList().run()}
        />
        <ToolbarButton
          icon={Quote}
          label="Trích dẫn"
          active={state.quote}
          onClick={() => chain().toggleBlockquote().run()}
        />
        <span className="mx-1 w-px self-stretch bg-border" />
        <ToolbarButton icon={Link2} label="Chèn liên kết" active={state.link} onClick={() => setLinkOpen(true)} />
        {state.link && <ToolbarButton icon={Link2Off} label="Bỏ liên kết" onClick={() => chain().unsetLink().run()} />}
        <ToolbarButton
          icon={uploading ? Loader2 : ImagePlus}
          label="Chèn ảnh"
          disabled={uploading}
          spin={uploading}
          onClick={() => fileRef.current?.click()}
        />
        <span className="mx-1 w-px self-stretch bg-border" />
        <ToolbarButton icon={Undo2} label="Hoàn tác" disabled={!state.canUndo} onClick={() => chain().undo().run()} />
        <ToolbarButton icon={Redo2} label="Làm lại" disabled={!state.canRedo} onClick={() => chain().redo().run()} />
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void insertImages(e.target.files)}
      />
      <LinkDialog editor={editor} open={linkOpen} onOpenChange={setLinkOpen} />
    </div>
  );
}
