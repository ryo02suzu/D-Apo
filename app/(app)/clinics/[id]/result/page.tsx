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
  const member = await getCurrentMember();

  const c = await selectClinic(supabase, id);
  if (!c) notFound();

  return (
    <ResultForm
      clinicId={c.id}
      clinicName={c.name}
      phone={c.phone}
      currentStatus={c.status}
      memberId={member?.id ?? null}
    />
  );
}
