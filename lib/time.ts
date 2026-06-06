// lib/time.ts
// デザインモック components.jsx の fmtAgo / fmtClock を実時刻ベースに移植。
// モックは NOW=2026-06-05 固定だったが、本番は現在時刻を基準にする。

/**
 * 相対時刻。updated_at(ISO) → 「たった今 / N分前 / N時間前 / N日前」。
 * null（未架電）のときは空文字を返す（呼び出し側で「未架電」を出す）。
 * 基準は now（既定 = 現在時刻）。
 */
export function fmtAgo(iso: string | null, now: number = Date.now()): string {
  if (!iso) return "";
  const diff = (now - new Date(iso).getTime()) / 60000;
  if (diff < 1) return "たった今";
  if (diff < 60) return `${Math.floor(diff)}分前`;
  if (diff < 1440) return `${Math.floor(diff / 60)}時間前`;
  return `${Math.floor(diff / 1440)}日前`;
}
