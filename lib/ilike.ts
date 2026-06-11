// lib/ilike.ts
// PostgREST の or()/ilike で使う値のエスケープ（サーバー/クライアント共通）。
// カンマは or() の区切り、% は LIKE のワイルドカード、括弧も予約文字なので無害化する。
export function escapeIlike(value: string): string {
  return value.replace(/[,()%]/g, (m) => (m === "%" ? "\\%" : " "));
}

// ---- 医療法人の判定（名称ベース） ----------------------------------
// 実データ調査（2026-06）: 「医療法人」を含む 8,758件 / 「（医）」27件 / 半角「(医)」0件。
// この2パターンで法人を網羅できる。
/** 法人名パターン（ilike 用）。or() と not() の両方で同じ集合を使い対称性を保つ。 */
export const CORP_ILIKE_PATTERNS = ["%医療法人%", "%（医）%"] as const;

/** supabase-js の .or() に渡す法人判定の条件文字列。 */
export const CORP_OR_CONDITION = CORP_ILIKE_PATTERNS.map(
  (p) => `name.ilike.${p}`,
).join(",");

