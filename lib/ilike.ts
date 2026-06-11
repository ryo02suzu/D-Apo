// lib/ilike.ts
// PostgREST の or()/ilike で使う値のエスケープ（サーバー/クライアント共通）。
// カンマは or() の区切り、% は LIKE のワイルドカード、括弧も予約文字なので無害化する。
export function escapeIlike(value: string): string {
  return value.replace(/[,()%]/g, (m) => (m === "%" ? "\\%" : " "));
}
