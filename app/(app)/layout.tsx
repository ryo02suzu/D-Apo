// app/(app)/layout.tsx
// 認証済みエリアの共通シェル。ヘッダ＋下タブ（5タブ・中央FAB）。
// 合言葉ログインの可否は proxy.ts が Cookie で判定済み。
// ログイン後、まだ「自分が誰か」を選んでいなければ MemberPicker を出す。
import { logout } from "@/app/(auth)/login/actions";
import { AppHeader } from "@/components/app-header";
import { MemberPicker } from "@/components/member-picker";
import { MemberProvider } from "@/components/member-context";
import { PresenceProvider } from "@/components/presence-provider";
import { RealtimeToast } from "@/components/realtime-toast";
import { SwRegister } from "@/components/sw-register";
import { TabBar } from "@/components/tab-bar";
import {
  clearMember,
  createAndSetMember,
  getCurrentMember,
  listMembers,
  setMember,
} from "@/lib/member";
import { fetchNextClinicId } from "@/lib/next-clinic";
import { createClient } from "@/lib/supabase/server";

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

  // 中央FABの遷移先（次に電話する医院）を軽量取得（limit 1）
  const supabase = await createClient();
  const nextId = await fetchNextClinicId(supabase);
  const nextHref = nextId ? `/clinics/${nextId}` : "/clinics/list";

  return (
    <MemberProvider
      member={{ id: member.id, name: member.name, color: member.color }}
    >
      <PresenceProvider>
        <div className="app-shell">
          <SwRegister />
          <AppHeader onLogout={logout} onChangeMember={clearMember} />
          <RealtimeToast />

          <main className="screen" style={{ paddingBottom: "92px" }}>
            {children}
          </main>

          <TabBar nextHref={nextHref} />
        </div>
      </PresenceProvider>
    </MemberProvider>
  );
}
