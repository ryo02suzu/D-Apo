import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Zen_Kaku_Gothic_New } from "next/font/google";
import "./globals.css";

// デザインモック（Dentia.html）と同じ和文フォント。
const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

const zenKaku = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-zen-kaku",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dentia — 歯科医院 架電CRM",
  description:
    "歯科医院への架電業務を効率化する、少人数チーム向けの軽量CRM。Next.js + Supabase。",
};

export const viewport: Viewport = {
  themeColor: "#6ab3e0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSansJP.variable} ${zenKaku.variable} h-full antialiased`}
    >
      <body
        className="app-root min-h-full"
        style={{
          fontFamily: `var(--font-noto-sans-jp), "Noto Sans JP", -apple-system, BlinkMacSystemFont, sans-serif`,
        }}
      >
        {children}
      </body>
    </html>
  );
}
