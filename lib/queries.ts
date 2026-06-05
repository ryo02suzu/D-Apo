// lib/queries.ts
// members の join（PostgREST embed）はマイグレーション適用後にのみ成立する。
// 未適用の環境でもデータが必ずロードされるよう、embed が失敗したら
// embed なしの select にフォールバックするヘルパ。
import { createClient } from "@/lib/supabase/server";
import type { Clinic, CallLogFeedItem, CallLogWithUser } from "@/lib/types";

type DB = Awaited<ReturnType<typeof createClient>>;

/** 医院一覧（担当者 members を join、失敗時は embed なし） */
export async function selectClinics(
  supabase: DB,
  opts: { order?: { column: string; ascending: boolean } } = {},
): Promise<Clinic[]> {
  const order = opts.order ?? { column: "updated_at", ascending: false };
  const withEmbed = await supabase
    .from("clinics")
    .select("*, members:assigned_to(name,color)")
    .order(order.column, { ascending: order.ascending });
  if (!withEmbed.error) return (withEmbed.data ?? []) as Clinic[];

  const plain = await supabase
    .from("clinics")
    .select("*")
    .order(order.column, { ascending: order.ascending });
  return (plain.data ?? []) as Clinic[];
}

/** 単一医院（担当者 members を join、失敗時は embed なし） */
export async function selectClinic(
  supabase: DB,
  id: string,
): Promise<Clinic | null> {
  const withEmbed = await supabase
    .from("clinics")
    .select("*, members:assigned_to(name,color)")
    .eq("id", id)
    .single();
  if (!withEmbed.error) return (withEmbed.data as Clinic) ?? null;

  const plain = await supabase
    .from("clinics")
    .select("*")
    .eq("id", id)
    .single();
  return (plain.data as Clinic) ?? null;
}

/** 医院の架電履歴（発信者 members を join、失敗時は embed なし） */
export async function selectClinicLogs(
  supabase: DB,
  clinicId: string,
): Promise<CallLogWithUser[]> {
  const withEmbed = await supabase
    .from("call_logs")
    .select("*, members:user_id(name,color)")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });
  if (!withEmbed.error) return (withEmbed.data ?? []) as CallLogWithUser[];

  const plain = await supabase
    .from("call_logs")
    .select("*")
    .eq("clinic_id", clinicId)
    .order("created_at", { ascending: false });
  return (plain.data ?? []) as CallLogWithUser[];
}

/** 全架電履歴フィード（発信者 members + 医院名 clinics を join、失敗時は embed なし） */
export async function selectCallLogFeed(
  supabase: DB,
  limit = 200,
): Promise<CallLogFeedItem[]> {
  const withEmbed = await supabase
    .from("call_logs")
    .select("*, members:user_id(name,color), clinics:clinic_id(id,name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!withEmbed.error) return (withEmbed.data ?? []) as CallLogFeedItem[];

  // clinics の embed は元から FK があるので、members だけ外して再試行
  const noMember = await supabase
    .from("call_logs")
    .select("*, clinics:clinic_id(id,name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!noMember.error) return (noMember.data ?? []) as CallLogFeedItem[];

  const plain = await supabase
    .from("call_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (plain.data ?? []) as CallLogFeedItem[];
}
