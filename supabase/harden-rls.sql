-- =====================================================================
-- RLS ハードニング：anon ロールから DELETE 権限を剥奪する
-- Supabase の SQL Editor に貼って実行する（auth-simplify.sql / members.sql の後に1回）。
--
-- 背景：anon キーはブラウザに露出するため、現状の "for all"（= SELECT/INSERT/
--       UPDATE/DELETE 全部）ポリシーだと、キーを知る第三者が行を一括削除できる。
-- 方針：アプリは一切 DELETE を行わない（架電履歴は残す設計）。よって anon の
--       権限を SELECT / INSERT / UPDATE のみに絞り、DELETE を不可にする。
--       これによりアプリの動作は変わらず、誤用・悪用時の全削除リスクだけを消す。
--       （authenticated も同様に DELETE を与えない。必要になったら別途付与。）
-- =====================================================================

-- ---- clinics：読み書き可・削除不可 ----
drop policy if exists "anon manage clinics" on public.clinics;
drop policy if exists "auth manage clinics" on public.clinics;
drop policy if exists "anon read clinics"   on public.clinics;
drop policy if exists "anon insert clinics" on public.clinics;
drop policy if exists "anon update clinics" on public.clinics;
create policy "anon read clinics"
  on public.clinics for select to anon, authenticated using (true);
create policy "anon insert clinics"
  on public.clinics for insert to anon, authenticated with check (true);
create policy "anon update clinics"
  on public.clinics for update to anon, authenticated using (true) with check (true);

-- ---- phone_candidates：読み書き可・削除不可 ----
drop policy if exists "anon manage phone_candidates" on public.phone_candidates;
drop policy if exists "auth manage phone_candidates" on public.phone_candidates;
drop policy if exists "anon read phone_candidates"   on public.phone_candidates;
drop policy if exists "anon insert phone_candidates" on public.phone_candidates;
drop policy if exists "anon update phone_candidates" on public.phone_candidates;
create policy "anon read phone_candidates"
  on public.phone_candidates for select to anon, authenticated using (true);
create policy "anon insert phone_candidates"
  on public.phone_candidates for insert to anon, authenticated with check (true);
create policy "anon update phone_candidates"
  on public.phone_candidates for update to anon, authenticated using (true) with check (true);

-- ---- members：読み書き可・削除不可 ----
drop policy if exists "members all"    on public.members;
drop policy if exists "members read"   on public.members;
drop policy if exists "members insert" on public.members;
drop policy if exists "members update" on public.members;
create policy "members read"
  on public.members for select to anon, authenticated using (true);
create policy "members insert"
  on public.members for insert to anon, authenticated with check (true);
create policy "members update"
  on public.members for update to anon, authenticated using (true) with check (true);

-- ---- call_logs ----
-- auth-simplify.sql で既に SELECT / INSERT のみ（UPDATE/DELETE なし）。
-- 履歴は不変・追記のみの方針どおりなので変更不要。
