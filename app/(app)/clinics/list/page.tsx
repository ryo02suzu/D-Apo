// app/(app)/clinics/list/page.tsx
// 一覧（ListScreen）。検索＋ステータスチップ＋医院カード（mini call FAB）。
// Server Component で clinics を select（担当者 members を join）し、
// ClinicListRealtime（Client）へ渡す（SSR + Realtime購読）。
import { ClinicListRealtime } from "@/components/clinic-list-realtime";
import { selectClinics } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClinicsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();
  const clinics = await selectClinics(supabase, {
    order: { column: "updated_at", ascending: false },
  });

  return (
    <div className="pbody list-body">
      <ClinicListRealtime initial={clinics} initialStatus={status} />
    </div>
  );
}
