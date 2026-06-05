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
    <div className="pbody list-body">
      <div className="sec" style={{ paddingTop: 12 }}>
        <div className="pc-top">
          <span className="lbl">架電の進捗</span>
          <span className="link">全{total}件</span>
        </div>
        <div className="pc-num">
          <b>{called}</b>
          <span>/ {total} 件</span>
        </div>
        <div className="bar">
          <i style={{ width: `${total ? (called / total) * 100 : 0}%` }} />
        </div>
        <div className="stat3">
          <div className="cell">
            <div className="k">ヒアリング</div>
            <div className="v">
              {heard}
              <small>件</small>
            </div>
          </div>
          <div className="cell">
            <div className="k">アポ獲得</div>
            <div className="v">
              {appointment}
              <small>件</small>
            </div>
          </div>
          <div className="cell">
            <div className="k">ヒアリング率</div>
            <div className="v">
              {heardRate}
              <small>%</small>
            </div>
          </div>
        </div>
      </div>

      <div className="divider" />

      <ClinicListRealtime initial={clinics} />
    </div>
  );
}
