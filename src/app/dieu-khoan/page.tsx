import type { Metadata } from "next";
import { PageTitle } from "@/components/layout/page-title";

export const metadata: Metadata = { title: "Điều khoản sử dụng" };

// Nội dung tạm, chủ website tự cập nhật bản chính thức.
export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <PageTitle title="Điều khoản sử dụng" />
      <div className="space-y-3 text-muted-foreground">
        <p>Khi đăng tin trên Chợ Đồ Cũ, bạn cam kết thông tin là đúng sự thật và hàng hóa được phép mua bán.</p>
        <p>Chợ Đồ Cũ là nơi kết nối người mua và người bán, không tham gia vào giao dịch giữa hai bên.</p>
        <p>Tin vi phạm có thể bị gỡ và tài khoản vi phạm nhiều lần có thể bị khóa.</p>
        <p>Nội dung chi tiết đang được cập nhật.</p>
      </div>
    </div>
  );
}
