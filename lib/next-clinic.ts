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
 * 「次に電話する医院」の id だけを軽量取得（318件を読まず limit 1 クエリ）。
 * 未架電 → 折り返し(不通/担当者不在) → 先頭 の優先順位。
 */
export async function fetchNextClinicId(supabase: DB): Promise<string | null> {
  // 電話番号が無い医院は架電できないため除外する（phone IS NOT NULL）。
  const notCalled = await supabase
    .from("clinics")
    .select("id")
    .not("phone", "is", null)
    .eq("status", "not_called")
    .order("updated_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (notCalled.data?.id) return notCalled.data.id;

  const followup = await supabase
    .from("clinics")
    .select("id")
    .not("phone", "is", null)
    .in("status", FOLLOWUP)
    .order("updated_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (followup.data?.id) return followup.data.id;

  const first = await supabase
    .from("clinics")
    .select("id")
    .not("phone", "is", null)
    .order("updated_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return first.data?.id ?? null;
}
