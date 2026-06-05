// app/(app)/layout.tsx
// 認証済みエリアの共通シェル。ヘッダ＋下タブナビ。
// 設計書 Phase 1: メンバーは初回ログイン時に profiles を upsert する。
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/login/actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 初回ログイン時に profiles を upsert（表示名は招待時のメタdata → なければメール）
  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "メンバー";
  await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name: displayName }, { onConflict: "id" });

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
            {displayName} / ログアウト
          </button>
        </form>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-2xl items-center justify-around border-t border-slate-200 bg-white/95 px-2 py-2 backdrop-blur">
        <NavItem href="/clinics" icon="📋" label="医院一覧" />
        <NavItem href="/clinics?open=1" icon="🟢" label="営業中" />
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
