// app/(app)/layout.tsx
// 認証済みエリアの共通シェル。ヘッダ＋下タブナビ（Dentia.html 準拠）。
// 合言葉方式：ログインの可否は proxy.ts が Cookie で判定済み。
import Link from "next/link";
import { logout } from "@/app/(auth)/login/actions";
import { Icon } from "@/components/icon";
import { TabBarItem } from "@/components/tab-bar-item";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <header className="apphead">
        <Link href="/clinics" className="brand">
          <span className="mark">
            <Icon name="tooth" size={18} fill />
          </span>
          <span className="title">歯科医院 架電CRM</span>
        </Link>
        <form action={logout}>
          <button type="submit" className="ah-btn ttl-link">
            ログアウト
          </button>
        </form>
      </header>

      <main className="screen" style={{ paddingBottom: "84px" }}>
        {children}
      </main>

      <nav className="tabbar">
        <TabBarItem href="/clinics" icon="list" label="医院一覧" />
        <TabBarItem href="/clinics/review" icon="phone" label="番号確認" />
      </nav>
    </div>
  );
}
