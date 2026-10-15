import Link from "next/link";
import { Logo } from "@/components/layout/logo";

const links = [
  { href: "/tin-tuc", label: "Tin tức" },
  { href: "/dieu-khoan", label: "Điều khoản" },
  { href: "/chinh-sach-bao-mat", label: "Chính sách bảo mật" },
  { href: "/lien-he", label: "Liên hệ" },
];

/** Chân trang của trang chủ. */
export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row md:justify-between">
        <div className="max-w-sm space-y-2">
          <Logo />
          <p className="text-sm text-muted-foreground">
            Chợ Đồ Cũ giúp bạn đăng tin và tìm đồ cũ, xe cộ, nhà đất, việc làm gần nơi mình ở, ngay trên bản đồ.
            Xem tin miễn phí, liên hệ trực tiếp với người bán.
          </p>
        </div>
        <nav aria-label="Liên kết chân trang">
          <ul className="grid grid-cols-2 gap-x-6 text-sm md:grid-cols-1">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link href={href} className="flex min-h-11 items-center text-muted-foreground hover:text-foreground">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="border-t px-4 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Chợ Đồ Cũ
      </p>
    </footer>
  );
}
