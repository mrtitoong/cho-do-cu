import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";

export const metadata: Metadata = { title: "Tin nhắn" };

/** Khung bên phải khi chưa chọn cuộc trò chuyện (chỉ hiện trên máy tính; hộp thư nằm trong layout). */
export default function MessagesPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
      <MessageCircle className="size-12" />
      <p>Chọn một cuộc trò chuyện để xem tin nhắn.</p>
    </div>
  );
}
