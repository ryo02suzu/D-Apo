// components/tab-bar-item.tsx
// 下タブの 1 項目。現在ルートに応じて on 状態（teal）を付ける。
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icon";

export function TabBarItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  const pathname = usePathname();
  // /clinics は完全一致系（詳細含む）、/clinics/review は前方一致で判定。
  const active =
    href === "/clinics"
      ? pathname === "/clinics" || /^\/clinics\/(?!review)/.test(pathname)
      : pathname.startsWith(href);

  return (
    <Link href={href} className={"tab" + (active ? " on" : "")}>
      <Icon name={icon} size={22} />
      {label}
    </Link>
  );
}
