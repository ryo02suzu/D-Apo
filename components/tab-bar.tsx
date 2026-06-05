// components/tab-bar.tsx
// デザインモック（components.jsx TabBar）に対応する5タブの下部バー。
// ホーム / 一覧 / [次の医院=中央FAB] / 履歴 / ダッシュ。
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";

type Tab = { href: string; icon: string; label: string };

const LEFT: Tab[] = [
  { href: "/clinics", icon: "home", label: "ホーム" },
  { href: "/clinics/list", icon: "list", label: "一覧" },
];
const RIGHT: Tab[] = [
  { href: "/history", icon: "clock", label: "履歴" },
  { href: "/dashboard", icon: "chart", label: "ダッシュ" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/clinics") {
    // ホーム＝/clinics 完全一致、または医院詳細 /clinics/[id]
    return (
      pathname === "/clinics" ||
      (/^\/clinics\/[^/]+$/.test(pathname) &&
        pathname !== "/clinics/list" &&
        pathname !== "/clinics/review")
    );
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function TabBar({ nextHref }: { nextHref: string }) {
  const pathname = usePathname();

  return (
    <nav className="tabbar">
      {LEFT.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={"tab" + (isActive(pathname, t.href) ? " on" : "")}
        >
          <Icon name={t.icon} size={22} />
          {t.label}
        </Link>
      ))}

      <Link href={nextHref} className="tab fab">
        <span className="fab-c">
          <Icon name="phone" fill size={24} style={{ color: "#fff" }} />
        </span>
        次の医院
      </Link>

      {RIGHT.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={"tab" + (isActive(pathname, t.href) ? " on" : "")}
        >
          <Icon name={t.icon} size={22} />
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
