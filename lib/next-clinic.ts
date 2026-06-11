// lib/next-clinic.ts
// 「次に電話する医院」を選ぶロジック（HomeScreen / 中央FAB で共有）。
// 未架電を最優先、無ければ折り返し対象（不通・担当者不在）、それも無ければ先頭。
// さらに各優先帯の中では「いま診療中(JST)」の医院を優先する（昼休み・休診への
// 無駄架電を減らす）。診療中が1件も無ければ帯の先頭へフォールバック。
import { callStatusNow } from "@/lib/hours";
import type { Clinic, ClinicStatus, WeeklyHours } from "@/lib/types";
import type { createClient } from "@/lib/supabase/server";

const FOLLOWUP: ClinicStatus[] = ["no_answer", "unavailable"];

export function nextToCall<T extends Pick<Clinic, "status">>(
  clinics: T[],
): T | null {
  if (clinics.length === 0) return null;
  return (
    clinics.find((c) => c.status === "not_called") ??
    clinics.find((c) => FOLLOWUP.includes(c.status)) ??
    clinics[0]
  );
}

type DB = Awaited<ReturnType<typeof createClient>>;

/** 候補バッチから「いま診療中」の最初の1件を選ぶ。無ければ先頭へフォールバック。 */
function pickOpenFirst(
  rows: { id: string; hours: WeeklyHours | null }[],
): string | null {
  if (rows.length === 0) return null;
  const open = rows.find((r) => callStatusNow(r.hours) === "open");
  return (open ?? rows[0]).id;
}

/** 1帯あたりの候補数。診療中の医院を探す範囲（大きいほど精度↑・転送量↑）。 */
const CANDIDATES = 30;

/**
 * 「次に電話する医院」の id だけを軽量取得（全件を読まず候補バッチ1回）。
 * 優先順位: 未架電 → 折り返し(不通/担当者不在) → (任意で)先頭。
 * 各帯の中では「いま診療中(JST)」を優先し、無ければ帯の先頭（更新が古い順）。
 * - 電話番号が無い医院は架電できないため常に除外（phone IS NOT NULL）。
 * - excludeId: 現在の医院を除外（結果画面の「次へ」用）。
 * - fallbackToFirst: 未架電も折り返しも無いとき先頭に回すか（既定 true。
 *   結果画面では false にし、対象が尽きたら null を返す）。
 */
export async function fetchNextClinicId(
  supabase: DB,
  opts: { excludeId?: string; fallbackToFirst?: boolean } = {},
): Promise<string | null> {
  const { excludeId, fallbackToFirst = true } = opts;

  // 共通条件（電話あり・任意で現在の医院を除外）を備えたクエリを毎回新規に組む。
  const base = () => {
    const q = supabase
      .from("clinics")
      .select("id,hours")
      .not("phone", "is", null);
    return excludeId ? q.neq("id", excludeId) : q;
  };
  type Row = { id: string; hours: WeeklyHours | null };

  const notCalled = await base()
    .eq("status", "not_called")
    .order("updated_at", { ascending: true })
    .limit(CANDIDATES);
  const fromNotCalled = pickOpenFirst((notCalled.data ?? []) as Row[]);
  if (fromNotCalled) return fromNotCalled;

  const followup = await base()
    .in("status", FOLLOWUP)
    .order("updated_at", { ascending: true })
    .limit(CANDIDATES);
  const fromFollowup = pickOpenFirst((followup.data ?? []) as Row[]);
  if (fromFollowup) return fromFollowup;

  if (!fallbackToFirst) return null;

  const first = await base()
    .order("updated_at", { ascending: true })
    .limit(CANDIDATES);
  return pickOpenFirst((first.data ?? []) as Row[]);
}
