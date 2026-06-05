// app/(app)/clinics/[id]/page.tsx
// 設計書 §3: 医院詳細。基本情報＋発信ボタン＋ステータス変更＋
// メモ付き架電結果フォーム＋過去履歴のタイムライン。
import Link from "next/link";
import { notFound } from "next/navigation";
import { CallButton } from "@/components/call-button";
import { CallLogForm } from "@/components/call-log-form";
import { CallLogTimeline } from "@/components/call-log-timeline";
import { OpenStatusBadge } from "@/components/open-status-badge";
import { StatusSelect } from "@/components/status-select";
import { createClient } from "@/lib/supabase/server";
import type { CallLogWithUser, Clinic } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClinicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: clinic } = await supabase
    .from("clinics")
    .select("*")
    .eq("id", id)
    .single();

  if (!clinic) notFound();
  const c = clinic as Clinic;

  const { data: logsData } = await supabase
    .from("call_logs")
    .select("*, profiles(display_name)")
    .eq("clinic_id", id)
    .order("created_at", { ascending: false });

  const logs = (logsData ?? []) as CallLogWithUser[];

  return (
    <div className="space-y-5">
      <Link
        href="/clinics"
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        ← 医院一覧へ
      </Link>

      {/* 基本情報 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1">
              <OpenStatusBadge hours={c.hours} />
            </div>
            <h1 className="text-xl font-bold text-slate-900">{c.name}</h1>
            {c.phone && (
              <a
                href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
                className="mt-1 inline-block text-emerald-700 underline"
              >
                {c.phone}
              </a>
            )}
            {c.address && (
              <p className="mt-1 text-sm text-slate-500">
                {c.prefecture}
                {c.city}
                {c.address}
              </p>
            )}
            {c.business_hours && (
              <p className="mt-1 text-xs text-slate-400">🕒 {c.business_hours}</p>
            )}
          </div>
        </div>
        <div className="mt-4">
          <CallButton phone={c.phone} />
        </div>
      </section>

      {/* ステータス変更 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-slate-500">
          現在のステータス
        </h2>
        <StatusSelect clinicId={c.id} value={c.status} />
      </section>

      {/* 架電結果入力 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-slate-500">
          架電結果を入力
        </h2>
        <CallLogForm clinicId={c.id} defaultStatus={c.status} />
      </section>

      {/* 履歴 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-slate-500">架電履歴</h2>
        <CallLogTimeline logs={logs} />
      </section>
    </div>
  );
}
