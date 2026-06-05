// =====================================================================
// 設計書 §4「営業中の判定（架電可否）」
// hours から「今かけてよいか」を判定する純粋関数。
// 必ず日本時間（JST）基準で評価する（端末のタイムゾーンに依存させない）。
// =====================================================================
import type { CallStatus, DayKey, WeeklyHours } from "@/lib/types";

const DAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** CallStatus → 画面表示（OpenStatusBadge 用） */
export const CALL_STATUS_LABEL: Record<CallStatus, string> = {
  open: "営業中",
  lunch: "昼休み",
  closed_today: "営業時間外",
  off: "休診",
  unknown: "時間未登録",
};

/** OpenStatusBadge の Tailwind クラス（緑／黄／灰／赤／無印） */
export const CALL_STATUS_CLASS: Record<CallStatus, string> = {
  open: "bg-emerald-100 text-emerald-700",
  lunch: "bg-amber-100 text-amber-700",
  closed_today: "bg-slate-100 text-slate-500",
  off: "bg-rose-100 text-rose-600",
  unknown: "bg-transparent text-slate-400",
};

export function callStatusNow(hours: WeeklyHours | null | undefined): CallStatus {
  if (!hours || Object.keys(hours).length === 0) return "unknown"; // 未登録なら判定しない

  // 現在の JST の曜日・時刻を取得
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const wd = parts
    .find((x) => x.type === "weekday")!
    .value.toLowerCase()
    .slice(0, 3) as DayKey;
  const hhmm = `${parts.find((x) => x.type === "hour")!.value}:${
    parts.find((x) => x.type === "minute")!.value
  }`;

  const today = hours[wd as keyof WeeklyHours];
  if (!today || today.length === 0) return "off"; // 休診日

  if (today.some(([open, close]) => hhmm >= open && hhmm < close)) return "open";

  // 診療日だが時間外：区間と区間の間（昼休み）にいれば昼休み、それ以外は営業時間外
  const inLunch = today.some(
    ([, close], i) => today[i + 1] && hhmm >= close && hhmm < today[i + 1][0],
  );
  return inLunch ? "lunch" : "closed_today";
}

export { DAY_KEYS };
