import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteHeader } from "@/components/layout/site-header";
import { Toaster } from "@/components/ui/sonner";
import { getSessionUser } from "@/lib/session";
import "./globals.css";

const font = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Chợ Đồ Cũ – Rao vặt theo bản đồ",
    template: "%s | Chợ Đồ Cũ",
  },
  description: "Đăng tin và tìm đồ cũ, xe cộ, nhà đất, việc làm gần bạn trên bản đồ.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();

  return (
    <html lang="vi" className={`${font.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader user={user} />
        <main className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
        <BottomNav loggedIn={Boolean(user)} />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
