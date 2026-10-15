import type { Metadata } from "next";
import { PageTitle } from "@/components/layout/page-title";

export const metadata: Metadata = { title: "Chính sách bảo mật" };

// Nội dung tạm, chủ website tự cập nhật bản chính thức.
export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <PageTitle title="Chính sách bảo mật" />
      <div className="space-y-3 text-muted-foreground">
        <p>Số điện thoại của bạn không hiển thị công khai, chỉ người đã đăng nhập mới xem được khi bấm “Liên hệ”.</p>
        <p>Vị trí trên bản đồ được làm mờ khoảng vài trăm mét, người xem không thấy địa chỉ chính xác.</p>
        <p>Tin nhắn chỉ người mua và người bán trong cuộc trò chuyện đọc được.</p>
        <p>Nội dung chi tiết đang được cập nhật.</p>
      </div>
    </div>
  );
}
