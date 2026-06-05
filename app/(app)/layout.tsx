// app/(app)/layout.tsx
// 認証済みエリアの共通シェル。ヘッダ＋下タブ（5タブ・中央FAB）。
// 合言葉ログインの可否は proxy.ts が Cookie で判定済み。
// ログイン後、まだ「自分が誰か」を選んでいなければ MemberPicker を出す。
import { logout } from "@/app/(auth)/login/actions";
import { AppHeader } from "@/components/app-header";
import { MemberPicker } from "@/components/member-picker";
import { MemberProvider } from "@/components/member-context";
import { TabBar } from "@/components/tab-bar";
import {
  clearMember,
  createAndSetMember,
  getCurrentMember,
  listMembers,
  setMember,
} from "@/lib/member";
import { nextToCall } from "@/lib/next-clinic";
import { createClient } from "@/lib/supabase/server";
import type { Clinic } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await getCurrentMember();

  // 担当者未選択 → ピッカーゲート（children は出さない）
  if (!member) {
    const members = await listMembers();
    return (
      <div className="app-shell">
        <MemberPicker
          members={members}
          onSelect={setMember}
          onCreate={createAndSetMember}
        />
      </div>
    );
  }

  // 中央FABの遷移先（次に電話する医院）を算出
  const supabase = await createClient();
  const { data } = await supabase
    .from("clinics")
    .select("id, status, updated_at")
    .order("updated_at", { ascending: true });
  const next = nextToCall((data ?? []) as Pick<Clinic, "id" | "status">[]);
  const nextHref = next ? `/clinics/${next.id}` : "/clinics/list";

  return (
    <MemberProvider
      member={{ id: member.id, name: member.name, color: member.color }}
    >
      <div className="app-shell">
        <AppHeader onLogout={logout} onChangeMember={clearMember} />

        <main className="screen" style={{ paddingBottom: "92px" }}>
          {children}
        </main>

        <TabBar nextHref={nextHref} />
      </div>
    </MemberProvider>
  );
}
