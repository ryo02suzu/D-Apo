// app/(app)/clinics/[id]/result/page.tsx
// モック ResultScreen に対応する独立ルート。
// 医院を取得し、結果入力フォーム（クライアント）を描画する。
// ヘッダ（左=✕で詳細へ / タイトル「架電結果を入力」）は app-header.tsx 側で出し分け。
import { notFound } from "next/navigation";
import { ResultForm } from "@/components/result-form";
import { getCurrentMember } from "@/lib/member";
import { selectClinic } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClinicResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // 「次に架電する医院」を決定（現在の医院は除外）。
  // 未架電を最優先、無ければ折り返し対象（不通・担当者不在）。
  // いずれも updated_at 昇順（＝最後に触れたのが古い順）で 1 件。
  async function pickNextId(): Promise<string | null> {
    // 電話番号が無い医院は架電できないため除外する（phone IS NOT NULL）。
    const notCalled = await supabase
      .from("clinics")
      .select("id")
      .neq("id", id)
      .not("phone", "is", null)
      .eq("status", "not_called")
      .order("updated_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (notCalled.data?.id) return notCalled.data.id as string;

    const followup = await supabase
      .from("clinics")
      .select("id")
      .neq("id", id)
      .not("phone", "is", null)
      .in("status", ["no_answer", "unavailable"])
      .order("updated_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (followup.data?.id) return followup.data.id as string;

    return null;
  }

  // member / 医院本体 / 次の医院 は互いに独立なので並列取得（逐次待ちを解消）。
  const [member, c, nextId] = await Promise.all([
    getCurrentMember(),
    selectClinic(supabase, id),
    pickNextId(),
  ]);
  if (!c) notFound();
  const nextHref = nextId ? `/clinics/${nextId}` : null;

  return (
    <ResultForm
      clinicId={c.id}
      clinicName={c.name}
      phone={c.phone}
      currentStatus={c.status}
      memberId={member?.id ?? null}
      nextHref={nextHref}
    />
  );
}
