import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/coming-soon";

export const metadata: Metadata = { title: "Tổng quan" };

export default function AdminHomePage() {
  return <ComingSoon title="Tổng quan" stage="7d (bảng thống kê)" />;
}
