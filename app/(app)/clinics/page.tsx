// app/(app)/clinics/page.tsx
// ホーム（HomeScreen / コールキュー）。
// presence ピル + 今日の進捗(stat3+bar) + 次に電話する医院 + 今日の予定。
import Link from "next/link";
import { CallPrimaryButton } from "@/components/call-primary-button";
import { Icon } from "@/components/icon";
import { PresencePills } from "@/components/presence-pills";
import { StatusBadge } from "@/components/status-badge";
import { fetchNextClinicId } from "@/lib/next-clinic";
import { selectClinic } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { fmtAgo } from "@/lib/time";
import type { Clinic } from "@/lib/types";

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

  // 「本日」(JST)の 00:00 を UTC ISO で求める（call_logs.created_at との比較用）。
  // サーバーコンポーネントのリクエスト処理中の現在時刻取得は正当なので purity 例外。
  // eslint-disable-next-line react-hooks/purity -- サーバー描画時の現在時刻取得（本日判定）
  const jstNow = new Date(Date.now() + 9 * 3600 * 1000);
  const startOfTodayJstMs =
    Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate()) -
    9 * 3600 * 1000;
  const startOfTodayJstUtc = new Date(startOfTodayJstMs).toISOString();
  // 本日(JST)の終わり＝翌0:00。期限超過/今日バッジの判定に使う。
  const endOfTodayJstUtc = new Date(
    startOfTodayJstMs + 24 * 3600 * 1000,
  ).toISOString();
  const nowIso = new Date(jstNow.getTime() - 9 * 3600 * 1000).toISOString();

  // 全件を読まず、COUNT クエリ（head:true）で集計を並列実行（53k 件でもスケール）
  const [
    totalRes,
    calledRes,
    todayCallsRes,
    todayHeardRes,
    todayAppoRes,
    nextId,
    schedRes,
    overdueRes,
  ] = await Promise.all([
    // 総件数（全体の母数）
    supabase.from("clinics").select("id", { count: "exact", head: true }),
    // 架電済み（未架電以外）＝全体の累計
    supabase
      .from("clinics")
      .select("id", { count: "exact", head: true })
      .neq("status", "not_called"),
    // 本日の架電数（call_logs の当日件数）
    supabase
      .from("call_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfTodayJstUtc),
    // 本日のヒアリング＋アポ
    supabase
      .from("call_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfTodayJstUtc)
      .in("outcome", ["heard", "appointment"]),
    // 本日のアポ獲得
    supabase
      .from("call_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfTodayJstUtc)
      .eq("outcome", "appointment"),
    // 次に電話する医院の id（limit 1）
    fetchNextClinicId(supabase),
    // 次回予定：next_action_at がある医院を近い順に最大8件
    supabase
      .from("clinics")
      .select("id,name,status,next_action_at")
      .not("next_action_at", "is", null)
      .order("next_action_at", { ascending: true })
      .limit(8),
    // 期限超過のフォロー数（next_action_at が現在より過去）
    supabase
      .from("clinics")
      .select("id", { count: "exact", head: true })
      .not("next_action_at", "is", null)
      .lt("next_action_at", nowIso),
  ]);

  // 集計（COUNT 結果）
  const total = totalRes.count ?? 0; // 全体の母数
  const called = calledRes.count ?? 0; // 全体の累計（架電済み）
  const todayCalls = todayCallsRes.count ?? 0; // 本日の架電数
  const todayHeard = todayHeardRes.count ?? 0; // 本日のヒアリング＋アポ
  const todayAppo = todayAppoRes.count ?? 0; // 本日のアポ
  const todayHeardRate = todayCalls
    ? Math.round((todayHeard / todayCalls) * 1000) / 10
    : 0;
  const overdueCount = overdueRes.count ?? 0; // 期限超過のフォロー数

  // 次に電話する医院（1件のみ取得）
  const next = nextId ? await selectClinic(supabase, nextId) : null;
  const nextTel = next?.phone ? next.phone.replace(/[^\d+]/g, "") : "";

  // 次回予定
  const schedule = (schedRes.data ?? []) as Pick<
    Clinic,
    "id" | "name" | "status" | "next_action_at"
  >[];

  return (
    <div className="pbody">
      <PresencePills />

      {/* 今日の進捗（本日の架電実績。母数は call_logs の当日件数） */}
      <div className="sec" style={{ paddingTop: 8 }}>
        <div className="pc-top">
          <span className="lbl">今日の進捗</span>
          <Link href="/dashboard" className="link">
            詳細を見る
          </Link>
        </div>
        <div className="pc-num">
          <b>{todayCalls}</b>
          <span>件 架電（本日）</span>
        </div>
        <div className="stat3">
          <div className="cell">
            <div className="k">本日ヒアリング</div>
            <div className="v">
              {todayHeard}
              <small>件</small>
            </div>
          </div>
          <div className="cell">
            <div className="k">本日アポ</div>
            <div className="v">
              {todayAppo}
              <small>件</small>
            </div>
          </div>
          <div className="cell">
            <div className="k">ヒアリング率</div>
            <div className="v">
              {todayHeardRate}
              <small>%</small>
            </div>
          </div>
        </div>
        <div className="bar">
          <i style={{ width: `${total ? (called / total) * 100 : 0}%` }} />
        </div>
        <div className="memo-tx" style={{ marginTop: 6 }}>
          全体の架電済み {called.toLocaleString()} / {total.toLocaleString()} 件
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

      {/* 今日の予定（期限超過・本日分は警告バッジで強調） */}
      <div className="sec sched">
        <div className="sec-head">
          <h3>次回予定</h3>
          {overdueCount > 0 && (
            <span className="badge b-red">期限超過 {overdueCount}件</span>
          )}
          <Link href="/clinics/list" className="link">
            すべて見る
          </Link>
        </div>
        {schedule.length === 0 ? (
          <p className="empty sm">予定はまだありません</p>
        ) : (
          schedule.map((c) => {
            const at = c.next_action_at!;
            const overdue = at < nowIso;
            const isToday = !overdue && at < endOfTodayJstUtc;
            return (
              <Link key={c.id} href={`/clinics/${c.id}`} className="item">
                <span className="time">
                  {formatSchedule(at).replace(/^\d+\/\d+\s/, "")}
                </span>
                <span className="cl">{c.name}</span>
                {overdue && <span className="badge b-red">超過</span>}
                {isToday && <span className="badge b-amber">今日</span>}
                <StatusBadge status={c.status} />
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
