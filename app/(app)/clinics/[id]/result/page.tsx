// app/(app)/clinics/[id]/result/page.tsx
// モック ResultScreen に対応する独立ルート。
// 医院を取得し、結果入力フォーム（クライアント）を描画する。
// ヘッダ（左=✕で詳細へ / タイトル「架電結果を入力」）は app-header.tsx 側で出し分け。
import { notFound } from "next/navigation";
import { ResultForm } from "@/components/result-form";
import { getCurrentMember } from "@/lib/member";
import { fetchNextClinicId } from "@/lib/next-clinic";
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

  // member / 医院本体 / 次の医院 は互いに独立なので並列取得（逐次待ちを解消）。
  // 次の医院は「現在の医院を除外」「対象が尽きたら先頭に戻さず null」で取得。
  const [member, c, nextId] = await Promise.all([
    getCurrentMember(),
    selectClinic(supabase, id),
    fetchNextClinicId(supabase, { excludeId: id, fallbackToFirst: false }),
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
