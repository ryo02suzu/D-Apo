// components/dashboard-activity.tsx
// ダッシュボード上部の「架電アクティビティ」カード（call_logs 由来）。
// 期間切替（今日/今週/今月, 既定=今週）と担当者別成績を表示する。
// 月初(JST)から当月分の call_logs を一度だけ取得し、期間で絞り込んで集計する。
"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/avatar";
import { createClient } from "@/lib/supabase/client";
import type { ClinicStatus } from "@/lib/types";

type Period = "today" | "week" | "month";

type LogRow = {
  id: string;
  outcome: ClinicStatus;
  created_at: string;
  user_id: string | null;
  members: { name: string; color: string } | null;
};

// ── Asia/Tokyo の期間境界ヘルパー ────────────────────────────────
// JST の Y/M/D を取得（en-CA は YYYY-MM-DD 形式）
function tokyoYMD(date: Date): { y: number; m: number; d: number } {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
}

// JST の曜日インデックス（Sun=0 … Sat=6）
function tokyoWeekday(date: Date): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
  }).format(date);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
}

// 指定 Y/M/D の JST 0:00 を UTC ミリ秒で返す
function jstMidnightUTC(y: number, m: number, d: number): number {
  return Date.UTC(y, m - 1, d) - 9 * 3600 * 1000;
}

// JST 0:00 を ISO 文字列で
function jstStartISO(y: number, m: number, d: number): string {
  return new Date(jstMidnightUTC(y, m, d)).toISOString();
}

// 当日 JST 0:00（ms）
function startOfDayMs(now: Date): number {
  const { y, m, d } = tokyoYMD(now);
  return jstMidnightUTC(y, m, d);
}

// 今週（月曜起点）JST 0:00（ms）
function startOfWeekMs(now: Date): number {
  const todayMs = startOfDayMs(now);
  const offsetToMon = (tokyoWeekday(now) + 6) % 7; // 月=0 … 日=6
  return todayMs - offsetToMon * 86400000;
}

// 今月 JST 0:00（ms）
function startOfMonthMs(now: Date): number {
  const { y, m } = tokyoYMD(now);
  return jstMidnightUTC(y, m, 1);
}

// 期間境界（ms）
function periodStartMs(period: Period, now: Date): number {
  if (period === "today") return startOfDayMs(now);
  if (period === "week") return startOfWeekMs(now);
  return startOfMonthMs(now);
}

// M/D 表記（JST）
function mdLabel(ms: number): string {
  const dt = new Date(ms);
  const { m, d } = tokyoYMD(dt);
  return `${m}/${d}`;
}

function pct(num: number, den: number): number {
  return den ? Math.round((num / den) * 1000) / 10 : 0;
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "今日" },
  { value: "week", label: "今週" },
  { value: "month", label: "今月" },
];

export function DashboardActivity() {
  const [period, setPeriod] = useState<Period>("week");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [now] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    const { y, m } = tokyoYMD(now);
    const startISO = jstStartISO(y, m, 1);
    (async () => {
      const { data } = await supabase
        .from("call_logs")
        .select("id,outcome,created_at,user_id, members:user_id(name,color)")
        .gte("created_at", startISO)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const rows = (data ?? []) as unknown as LogRow[];
      setLogs(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [now]);

  // 選択期間で絞り込み
  const startMs = periodStartMs(period, now);
  const periodLogs = useMemo(
    () => logs.filter((l) => new Date(l.created_at).getTime() >= startMs),
    [logs, startMs],
  );

  // 集計
  const total = periodLogs.length;
  const heard = periodLogs.filter(
    (l) => l.outcome === "heard" || l.outcome === "appointment",
  ).length;
  const appo = periodLogs.filter((l) => l.outcome === "appointment").length;
  const heardRate = pct(heard, total);
  const appoRate = pct(appo, total);

  // タイトル
  let title: string;
  if (period === "today") {
    title = "今日の架電";
  } else if (period === "week") {
    title = `今週の架電 (${mdLabel(startMs)}〜${mdLabel(startMs + 6 * 86400000)})`;
  } else {
    const { m } = tokyoYMD(now);
    title = `今月の架電 (${m}月)`;
  }

  // 担当者別集計
  const byMember = useMemo(() => {
    const map = new Map<
      string,
      { name: string; color: string; calls: number; appos: number }
    >();
    for (const l of periodLogs) {
      const key = l.user_id ?? "__none__";
      const cur = map.get(key) ?? {
        name: l.members?.name ?? "未記名",
        color: l.members?.color ?? "#9aa6b2",
        calls: 0,
        appos: 0,
      };
      cur.calls += 1;
      if (l.outcome === "appointment") cur.appos += 1;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.calls - a.calls);
  }, [periodLogs]);

  return (
    <div>
      <div className="chips segviews" role="tablist" aria-label="期間">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            role="tab"
            aria-selected={period === p.value}
            className={"chip segview" + (period === p.value ? " on" : "")}
            onClick={() => setPeriod(p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="dash-card">
        <div className="dash-head">
          <h4>{title}</h4>
        </div>
        <div className="dash3">
          <div className="c">
            <div className="k">架電数</div>
            <div className="v">
              {total}
              <small>件</small>
            </div>
          </div>
          <div className="c">
            <div className="k">ヒアリング</div>
            <div className="v">
              {heard}
              <small>件</small>
            </div>
          </div>
          <div className="c">
            <div className="k">アポ</div>
            <div className="v">
              {appo}
              <small>件</small>
            </div>
          </div>
        </div>
        <div className="dash2" style={{ marginTop: 16 }}>
          <div className="c">
            <div className="k">ヒアリング率</div>
            <div className="v">
              {heardRate}
              <small>%</small>
            </div>
          </div>
          <div className="c">
            <div className="k">アポ率</div>
            <div className="v">
              {appoRate}
              <small>%</small>
            </div>
          </div>
        </div>
      </div>

      <div className="cc-block">
        <h2>担当者別</h2>
        {byMember.length === 0 ? (
          <p className="empty">この期間の架電はまだありません</p>
        ) : (
          <div className="mstats">
            {byMember.map((mb, i) => (
              <div className="mstat" key={i}>
                <Avatar name={mb.name} color={mb.color} size={28} />
                <span className="ms-name">{mb.name}</span>
                <span className="ms-num">
                  {mb.calls}
                  <small>架電</small>
                </span>
                <span className="ms-num">
                  {mb.appos}
                  <small>アポ</small>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
