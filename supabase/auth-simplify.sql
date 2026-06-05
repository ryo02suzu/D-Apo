-- =====================================================================
-- 合言葉（共有パスワード）方式への切り替え用マイグレーション
-- Supabase の SQL Editor に貼って実行する（schema.sql 実行後に1回）。
--
-- 方針：アプリ側のログインは「合言葉 Cookie」で行うため、DB は anon ロール
--       （= NEXT_PUBLIC_SUPABASE_ANON_KEY）でも読み書きできるようにする。
--       記名（user_id）は使わないので call_logs.user_id を nullable にする。
--
-- ⚠️ セキュリティ注意：anon キーはブラウザに露出するため、これにより
--    「キーを知っていれば DB に直接アクセス可能」になります。社内利用・
--    公開オープンデータ中心の用途を想定した割り切りです。機微情報は入れない。
-- =====================================================================

-- 1) 記名なしで架電履歴を残せるように
alter table public.call_logs alter column user_id drop not null;

-- 2) RLS ポリシーを anon にも開放（authenticated と同条件）
-- clinics: 全件 読み書き
drop policy if exists "auth manage clinics" on public.clinics;
drop policy if exists "anon manage clinics" on public.clinics;
create policy "anon manage clinics"
  on public.clinics for all to anon, authenticated using (true) with check (true);

-- call_logs: 全件 閲覧＋追記（記名チェックは廃止）
drop policy if exists "auth read call_logs"   on public.call_logs;
drop policy if exists "auth insert call_logs" on public.call_logs;
drop policy if exists "anon read call_logs"   on public.call_logs;
drop policy if exists "anon insert call_logs" on public.call_logs;
create policy "anon read call_logs"
  on public.call_logs for select to anon, authenticated using (true);
create policy "anon insert call_logs"
  on public.call_logs for insert to anon, authenticated with check (true);

-- phone_candidates: 全件 読み書き（確認キューの承認/却下）
drop policy if exists "auth manage phone_candidates" on public.phone_candidates;
drop policy if exists "anon manage phone_candidates" on public.phone_candidates;
create policy "anon manage phone_candidates"
  on public.phone_candidates for all to anon, authenticated using (true) with check (true);

-- profiles: 閲覧のみ開放（タイムラインの結合用。中身は空でも可）
drop policy if exists "auth read profiles" on public.profiles;
drop policy if exists "anon read profiles" on public.profiles;
create policy "anon read profiles"
  on public.profiles for select to anon, authenticated using (true);
