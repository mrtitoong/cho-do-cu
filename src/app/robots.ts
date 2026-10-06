import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Trang cá nhân / cần đăng nhập, không có gì để lập chỉ mục
      disallow: ["/dang-nhap", "/dang-tin", "/tin-nhan", "/tin-cua-toi", "/ho-so", "/dat-lai-mat-khau", "/auth/", "/tin/*/sua"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
