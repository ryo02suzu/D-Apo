// app/(app)/dashboard/page.tsx
// 進捗ダッシュボード（DashScreen）。ステータス別件数・ヒアリング率/アポ率・
// サマリー行・横バー。clinics から集計する。
import Link from "next/link";
import { DashboardActivity } from "@/components/dashboard-activity";
import { Icon } from "@/components/icon";
import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";
import type { ClinicStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashScreen() {
  const supabase = await createClient();

  // 全件を読まず、ステータスごとに COUNT クエリ（head:true）を並列実行（スケール対応）
  const countResults = await Promise.all(
    STATUS_ORDER.map((s) =>
      supabase
        .from("clinics")
        .select("id", { count: "exact", head: true })
        .eq("status", s),
    ),
  );

  const counts = {} as Record<ClinicStatus, number>;
  STATUS_ORDER.forEach((s, i) => {
    counts[s] = countResults[i].count ?? 0;
  });

  const max = Math.max(...STATUS_ORDER.map((s) => counts[s]), 1);

  return (
    <div className="pbody list-body">
      {/* 架電アクティビティ（call_logs 由来 / 期間切替・担当者別） */}
      <DashboardActivity />

      {/* ステータス別サマリー */}
      <div className="cc-block">
        <h2>ステータス別サマリー</h2>
        {STATUS_ORDER.map((s) => (
          <Link
            key={s}
            href={`/clinics/list?status=${s}`}
            className="sumrow"
          >
            <span
              className="sdot"
              style={{ background: `var(--${STATUS_COLOR[s]})` }}
            />
            <span className="slabel">{STATUS_LABEL[s]}</span>
            <span className="scount">
              {counts[s]}
              <small>件</small>
            </span>
            <Icon
              name="chevR"
              size={16}
              sw={2.4}
              style={{ color: "var(--muted2)" }}
              className="chev"
            />
          </Link>
        ))}
      </div>

      {/* 横バー内訳 */}
      <div className="cc-block">
        <h2>架電数の内訳（バー）</h2>
        <div className="hbars">
          {STATUS_ORDER.map((s) => (
            <div className="hbar" key={s}>
              <span className="hb-label">{STATUS_LABEL[s]}</span>
              <div className="hb-track">
                <i
                  style={{
                    width: `${(counts[s] / max) * 100}%`,
                    background: `var(--${STATUS_COLOR[s]})`,
                  }}
                />
              </div>
              <span className="hb-num">{counts[s]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
