import type { Metadata } from "next";
import { PageTitle } from "@/components/layout/page-title";
import { requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Tin nhắn" };

export default async function MessagesPage() {
  await requireUser("/tin-nhan");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <PageTitle title="Tin nhắn" description="Các cuộc trò chuyện với người mua và người bán." />
    </div>
  );
}
