// app/(app)/layout.tsx
// 認証済みエリアの共通シェル。ヘッダ＋下タブナビ。
// 合言葉方式：ログインの可否は proxy.ts が Cookie で判定済み。
import Link from "next/link";
import { logout } from "@/app/(auth)/login/actions";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <Link href="/clinics" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-base">
            🦷
          </span>
          <span className="font-bold text-slate-900">歯科医院 架電CRM</span>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="text-xs font-medium text-slate-400 hover:text-slate-600"
          >
            ログアウト
          </button>
        </form>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-2xl items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur">
        <NavItem href="/clinics" icon="📋" label="医院一覧" />
        <NavItem href="/clinics/review" icon="☎️" label="番号確認" />
      </nav>
    </div>
  );
}

function NavItem({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-0.5 px-4 py-1 text-[11px] font-medium text-slate-500 hover:text-emerald-700"
    >
      <span className="text-lg leading-none">{icon}</span>
      {label}
    </Link>
  );
}
