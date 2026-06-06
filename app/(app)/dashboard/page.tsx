// app/(app)/dashboard/page.tsx
// 進捗ダッシュボード（DashScreen）。ステータス別件数・ヒアリング率/アポ率・
// サマリー行・横バー。clinics から集計する。
import Link from "next/link";
import { Icon } from "@/components/icon";
import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";
import type { Clinic, ClinicStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

// 今週（月〜日, Asia/Tokyo）の範囲を "M/D〜M/D" で返す。
function currentWeekRange(): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const y = Number(get("year"));
  const m = Number(get("month"));
  const d = Number(get("day"));
  const wd = get("weekday"); // Sun, Mon, ...
  const dayIdx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
  // 月曜起点のオフセット（日曜=6, 月曜=0）
  const offsetToMon = (dayIdx + 6) % 7;
  const tokyoMidnightUTC = Date.UTC(y, m - 1, d) - 9 * 3600 * 1000;
  const monday = new Date(tokyoMidnightUTC - offsetToMon * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  const md = (date: Date) => {
    const p = new Intl.DateTimeFormat("ja-JP", {
      timeZone: "Asia/Tokyo",
      month: "numeric",
      day: "numeric",
    }).format(date);
    return p.replace(/\//g, "/");
  };
  return `${md(monday)}〜${md(sunday)}`;
}

export default async function DashScreen() {
  const supabase = await createClient();
  const { data } = await supabase.from("clinics").select("status");
  const clinics = (data ?? []) as Pick<Clinic, "status">[];

  const counts = {} as Record<ClinicStatus, number>;
  for (const s of STATUS_ORDER) counts[s] = 0;
  for (const c of clinics) counts[c.status] = (counts[c.status] ?? 0) + 1;

  const total = clinics.length;
  const called = total - counts.not_called;
  const heard = counts.heard + counts.appointment;
  const appo = counts.appointment;
  const heardRate = called ? Math.round((heard / called) * 1000) / 10 : 0;
  const appoRate = called ? Math.round((appo / called) * 1000) / 10 : 0;
  const max = Math.max(...STATUS_ORDER.map((s) => counts[s]), 1);
  const weekRange = currentWeekRange();

  return (
    <div className="pbody list-body">
      {/* サマリーカード */}
      <div className="dash-card">
        <div className="dash-head">
          <h4>今週の進捗 ({weekRange})</h4>
        </div>
        <div className="dash3">
          <div className="c">
            <div className="k">架電数</div>
            <div className="v">
              {called}
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
            <div className="k">アポ獲得</div>
            <div className="v">
              {appo}
              <small>件</small>
            </div>
          </div>
        </div>
        <div className="bar" style={{ marginTop: 16 }}>
          <i style={{ width: `${total ? (called / total) * 100 : 0}%` }} />
        </div>
        <div className="dash2">
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
