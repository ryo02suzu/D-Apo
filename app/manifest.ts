// app/manifest.ts
// Web App Manifest（Next.js が <link rel="manifest"> を自動注入）。
// テーマ＝水色 #6ab3e0。アイコンは public/icons/ を参照。
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dentia — 歯科医院 架電CRM",
    short_name: "Dentia",
    description: "歯科医院への架電業務を効率化する、少人数チーム向けの軽量CRM。",
    start_url: "/clinics",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#6ab3e0",
    lang: "ja",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
