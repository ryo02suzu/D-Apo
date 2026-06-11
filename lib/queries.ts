// lib/queries.ts
// members の join（PostgREST embed）はマイグレーション適用後にのみ成立する。
// 未適用の環境でもデータが必ずロードされるよう、embed が失敗したら
// embed なしの select にフォールバックするヘルパ。
import { createClient } from "@/lib/supabase/server";
import {
  CORP_ILIKE_PATTERNS,
  CORP_OR_CONDITION,
  escapeIlike,
} from "@/lib/ilike";
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

/** 一覧ページのサーバー側フィルタ条件（searchParams 由来） */
export type ClinicPageFilters = {
  q?: string;
  pref?: string;
  city?: string;
  status?: string;
  /** ビュー: all | mine | follow | uncalled */
  view?: string;
  /** 並び替え: uncalled | next | updated | name */
  sort?: string;
  /** view=mine のときに使う現在メンバー id */
  memberId?: string;
  /** 種別: houjin（医療法人）| kojin（個人・その他）。未指定はすべて */
  corp?: string;
};

/** 要フォロー（ビュー）に含めるステータス */
const FOLLOW_STATUSES = ["no_answer", "unavailable"];

/**
 * 共通フィルタを Supabase クエリビルダに適用する。
 * select() 済みのクエリ（list 用 / count 用）どちらにも使える。
 */
function applyClinicFilters<T>(query: T, f: ClinicPageFilters): T {
  // PostgrestFilterBuilder はメソッドチェーンで自身（同型）を返すため any 経由で適用する。
  // 型は呼び出し側の T を維持する。
  let q = query as unknown as {
    or: (s: string) => typeof q;
    eq: (col: string, val: unknown) => typeof q;
    ilike: (col: string, val: string) => typeof q;
    in: (col: string, vals: unknown[]) => typeof q;
    not: (col: string, op: string, val: string) => typeof q;
  };
  if (f.q) {
    const v = escapeIlike(f.q);
    q = q.or(`name.ilike.%${v}%,address.ilike.%${v}%`);
  }
  if (f.pref) q = q.eq("prefecture", f.pref);
  if (f.city) q = q.ilike("city", `%${escapeIlike(f.city)}%`);
  if (f.status) q = q.eq("status", f.status);

  // 種別（医療法人かどうか）: 名称パターンで判定（lib/ilike.ts に集約）
  if (f.corp === "houjin") {
    q = q.or(CORP_OR_CONDITION);
  } else if (f.corp === "kojin") {
    // 法人パターンを1つも含まない＝NOT の AND 連結
    for (const p of CORP_ILIKE_PATTERNS) q = q.not("name", "ilike", p);
  }

  switch (f.view) {
    case "mine":
      q = q.eq("assigned_to", f.memberId ?? "");
      break;
    case "follow":
      q = q.in("status", FOLLOW_STATUSES);
      break;
    case "uncalled":
      q = q.eq("status", "not_called");
      break;
    default:
      break;
  }
  return q as unknown as T;
}

/** 並び替えキー → order() 適用 */
function applyClinicSort<T>(query: T, sort?: string): T {
  const q = query as unknown as {
    order: (
      col: string,
      opts: { ascending: boolean; nullsFirst?: boolean },
    ) => T;
  };
  switch (sort) {
    case "next":
      return q.order("next_action_at", { ascending: true, nullsFirst: false });
    case "name":
      return q.order("name", { ascending: true });
    case "updated":
      return q.order("updated_at", { ascending: false });
    case "uncalled":
    default:
      // SQL で not_called を先頭に固定するのは難しいため、既定は更新日時の降順。
      return q.order("updated_at", { ascending: false });
  }
}

/**
 * 一覧の 1 ページ分を取得（担当者 members を embed、失敗時は embed なし）。
 * count:"exact" で絞り込み後の総件数も返す。
 */
export async function selectClinicsPage(
  supabase: DB,
  opts: { filters: ClinicPageFilters; range: { from: number; to: number } },
): Promise<{ rows: Clinic[]; count: number }> {
  const { filters, range } = opts;

  const build = (select: string) => {
    let q = supabase.from("clinics").select(select, { count: "exact" });
    q = applyClinicFilters(q, filters);
    q = applyClinicSort(q, filters.sort);
    return q.range(range.from, range.to);
  };

  const withEmbed = await build("*, members:assigned_to(name,color)");
  if (!withEmbed.error) {
    return {
      rows: (withEmbed.data ?? []) as unknown as Clinic[],
      count: withEmbed.count ?? 0,
    };
  }

  const plain = await build("*");
  return {
    rows: (plain.data ?? []) as unknown as Clinic[],
    count: plain.count ?? 0,
  };
}

/**
 * 任意のフィルタにマッチする件数だけを取得（head:true で行は読まない）。
 */
export async function countClinics(
  supabase: DB,
  filters: ClinicPageFilters = {},
): Promise<number> {
  let q = supabase
    .from("clinics")
    .select("id", { count: "exact", head: true });
  q = applyClinicFilters(q, filters);
  const { count } = await q;
  return count ?? 0;
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
