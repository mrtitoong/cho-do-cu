import type { Metadata } from "next";
import { PageTitle } from "@/components/layout/page-title";

export const metadata: Metadata = { title: "Liên hệ" };

// Nội dung tạm, chủ website tự điền thông tin liên hệ.
export default function ContactPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <PageTitle title="Liên hệ" />
      <p className="text-muted-foreground">Thông tin liên hệ đang được cập nhật.</p>
    </div>
  );
}
