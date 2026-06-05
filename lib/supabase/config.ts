// lib/supabase/config.ts
// Supabase 接続情報。環境変数があればそれを使い、無ければ既定値にフォールバック。
// （Vercel に env を設定しなくても動くようにするための割り切り。
//   anon キーはもともとブラウザに公開される公開鍵なので埋め込み可。
//   DB 保護は RLS に依存しているため、機微な個人情報は入れない運用とする。）

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
  "https://ykwahrmqrrssaaftxmyz.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlrd2Focm1xcnJzc2FhZnR4bXl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTUwNDUsImV4cCI6MjA5NjIzMTA0NX0.EVBz3nzmWVBYBjxg04fSUt0KIBrVqqhJj6jazHyeR98";
