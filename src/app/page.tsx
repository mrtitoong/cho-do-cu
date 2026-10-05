import { PageTitle } from "@/components/layout/page-title";

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <PageTitle
        title="Chợ Đồ Cũ"
        description="Tìm đồ cũ, xe cộ, nhà đất, việc làm gần bạn trên bản đồ."
      />
    </div>
  );
}
