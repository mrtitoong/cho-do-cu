import type { NextConfig } from "next";

// Chỉ cho next/image tối ưu ảnh trong bucket công khai của dự án Supabase này.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseUrl ? [new URL(`${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/**`)] : [],
    // Tên file ảnh là uuid, nội dung không bao giờ đổi → giữ bản đã tối ưu lâu dài
    minimumCacheTTL: 2_678_400, // 31 ngày
  },
};

export default nextConfig;
