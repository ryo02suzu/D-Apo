// app/(app)/clinics/page.tsx
// ホーム（HomeScreen / コールキュー）。
// presence ピル + 今日の進捗(stat3+bar) + 次に電話する医院 + 今日の予定。
import Link from "next/link";
import { CallPrimaryButton } from "@/components/call-primary-button";
import { Icon } from "@/components/icon";
import { PresencePills } from "@/components/presence-pills";
import { StatusBadge } from "@/components/status-badge";
import { nextToCall } from "@/lib/next-clinic";
import { selectClinics } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { fmtAgo } from "@/lib/time";

export const dynamic = "force-dynamic";

function formatSchedule(iso: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function HomeScreen() {
  const supabase = await createClient();
  const clinics = await selectClinics(supabase, {
    order: { column: "updated_at", ascending: true },
  });

  // 進捗集計
  const total = clinics.length;
  const called = clinics.filter((c) => c.status !== "not_called").length;
  const heard = clinics.filter(
    (c) => c.status === "heard" || c.status === "appointment",
  ).length;
  const appo = clinics.filter((c) => c.status === "appointment").length;
  const heardRate = called ? Math.round((heard / called) * 1000) / 10 : 0;

  // 次に電話する医院
  const next = nextToCall(clinics);
  const nextTel = next?.phone ? next.phone.replace(/[^\d+]/g, "") : "";

  // 今日の予定：next_action_at がある医院を近い順に
  const schedule = clinics
    .filter((c) => c.next_action_at)
    .sort(
      (a, b) =>
        new Date(a.next_action_at!).getTime() -
        new Date(b.next_action_at!).getTime(),
    )
    .slice(0, 8);

  return (
    <div className="pbody">
      <PresencePills />

      {/* 今日の進捗 */}
      <div className="sec" style={{ paddingTop: 8 }}>
        <div className="pc-top">
          <span className="lbl">今日の進捗</span>
          <Link href="/dashboard" className="link">
            詳細を見る
          </Link>
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
              {appo}
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

      {/* 次に電話する医院 */}
      <div className="sec clinic">
        <div className="sec-head">
          <h3>次に電話する医院</h3>
          <Link href="/clinics/list" className="link">
            リストを表示
          </Link>
        </div>

        {next ? (
          <>
            <div className="row1">
              <StatusBadge status={next.status} />
              <span className="ago">
                {next.status === "not_called"
                  ? "未架電"
                  : `${fmtAgo(next.updated_at)}更新`}
              </span>
            </div>
            <Link href={`/clinics/${next.id}`} className="name">
              {next.name}
            </Link>
            {next.address && <div className="addr">{next.address}</div>}
            {next.phone && (
              <a className="tel" href={`tel:${nextTel}`}>
                <Icon name="phone" size={16} style={{ color: "var(--muted)" }} />
                {next.phone}
              </a>
            )}
            {next.latest_memo && (
              <>
                <div className="memo-lbl">前回メモ</div>
                <div className="memo-tx">{next.latest_memo}</div>
              </>
            )}
            <CallPrimaryButton clinicId={next.id} phone={next.phone} />
          </>
        ) : (
          <p className="empty">架電対象の医院がありません</p>
        )}
      </div>

      <div className="divider" />

      {/* 今日の予定 */}
      <div className="sec sched">
        <div className="sec-head">
          <h3>次回予定</h3>
          <Link href="/clinics/list" className="link">
            すべて見る
          </Link>
        </div>
        {schedule.length === 0 ? (
          <p className="empty sm">予定はまだありません</p>
        ) : (
          schedule.map((c) => (
            <Link key={c.id} href={`/clinics/${c.id}`} className="item">
              <span className="time">
                {formatSchedule(c.next_action_at!).replace(/^\d+\/\d+\s/, "")}
              </span>
              <span className="cl">{c.name}</span>
              <StatusBadge status={c.status} />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
