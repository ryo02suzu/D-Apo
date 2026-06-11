// lib/next-clinic.ts
// 「次に電話する医院」を選ぶロジック（HomeScreen / 中央FAB で共有）。
// 未架電を最優先、無ければ折り返し対象（不通・担当者不在）、それも無ければ先頭。
import type { Clinic, ClinicStatus } from "@/lib/types";
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

/**
 * 「次に電話する医院」の id だけを軽量取得（全件を読まず limit 1 クエリ）。
 * 優先順位: 未架電 → 折り返し(不通/担当者不在) → (任意で)先頭。
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
    const q = supabase.from("clinics").select("id").not("phone", "is", null);
    return excludeId ? q.neq("id", excludeId) : q;
  };

  const notCalled = await base()
    .eq("status", "not_called")
    .order("updated_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (notCalled.data?.id) return notCalled.data.id as string;

  const followup = await base()
    .in("status", FOLLOWUP)
    .order("updated_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (followup.data?.id) return followup.data.id as string;

  if (!fallbackToFirst) return null;

  const first = await base()
    .order("updated_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (first.data?.id as string) ?? null;
}
