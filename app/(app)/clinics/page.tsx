// app/(app)/clinics/page.tsx
// 設計書 §3 Phase 2/4: Server Component で clinics を select し、
// 初期データを ClinicListRealtime（Client）へ渡す（SSR + Realtime購読）。
import { ClinicListRealtime } from "@/components/clinic-list-realtime";
import { createClient } from "@/lib/supabase/server";
import type { Clinic } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClinicsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clinics")
    .select("*")
    .order("updated_at", { ascending: false });

  const clinics = (data ?? []) as Clinic[];

  // 進捗サマリ（今日に限らず全体の集計。MVPではシンプルに）
  const total = clinics.length;
  const heard = clinics.filter((c) => c.status === "heard").length;
  const appointment = clinics.filter((c) => c.status === "appointment").length;
  const called = clinics.filter((c) => c.status !== "not_called").length;
  const heardRate = called ? Math.round((heard / called) * 1000) / 10 : 0;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <h1 className="text-sm font-medium text-slate-500">架電の進捗</h1>
          <span className="text-xs text-slate-400">全{total}件</span>
        </div>
        <p className="mt-1 text-3xl font-bold text-slate-900">
          {called}
          <span className="ml-1 text-base font-medium text-slate-400">
            / {total} 件
          </span>
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-emerald-500"
            style={{ width: `${total ? (called / total) * 100 : 0}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Metric label="ヒアリング" value={`${heard}件`} />
          <Metric label="アポ獲得" value={`${appointment}件`} />
          <Metric label="ヒアリング率" value={`${heardRate}%`} />
        </div>
      </section>

      <ClinicListRealtime initial={clinics} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 py-2">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-base font-bold text-slate-800">{value}</p>
    </div>
  );
}
