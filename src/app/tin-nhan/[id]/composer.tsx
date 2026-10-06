"use client";

import { useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAX_MESSAGE_LENGTH } from "@/lib/chat";
import { cn } from "@/lib/utils";

/** Ô nhập tin nhắn: Enter để gửi, Shift+Enter xuống dòng, tối đa 1000 ký tự. */
export function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);
  const canSend = text.trim().length > 0;

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function submit() {
    if (!canSend) return;
    onSend(text);
    setText("");
    requestAnimationFrame(() => {
      resize();
      ref.current?.focus();
    });
  }

  return (
    <form
      className="flex items-end gap-2 border-t bg-background p-2 md:p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="relative min-w-0 flex-1">
        <textarea
          ref={ref}
          rows={1}
          value={text}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="Nhập tin nhắn..."
          aria-label="Nội dung tin nhắn"
          className="block max-h-32 min-h-11 w-full resize-none rounded-2xl border border-input bg-transparent px-4 py-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:text-sm"
          onChange={(e) => {
            setText(e.target.value);
            resize();
          }}
          onKeyDown={(e) => {
            // isComposing: đang gõ dấu tiếng Việt bằng bộ gõ (IME) thì Enter không gửi.
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
        />
        {text.length > MAX_MESSAGE_LENGTH - 100 && (
          <span
            className={cn(
              "absolute right-3 -top-5 text-xs",
              text.length >= MAX_MESSAGE_LENGTH ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {text.length}/{MAX_MESSAGE_LENGTH}
          </span>
        )}
      </div>
      <Button type="submit" size="icon" className="size-11 shrink-0 rounded-full" disabled={!canSend} aria-label="Gửi">
        <SendHorizontal />
      </Button>
    </form>
  );
}
