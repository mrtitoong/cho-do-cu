import type { Metadata } from "next";
import { ComingSoon } from "@/components/admin/coming-soon";

export const metadata: Metadata = { title: "Tin tức" };

export default function AdminPostsPage() {
  return <ComingSoon title="Tin tức" stage="7c" />;
}
