-- =====================================================================
-- 歯科医院 架電CRM（Dentia） メンバー（担当者）テーブル
-- 合言葉ログインの後、アプリ内で「自分が誰か」を選ぶための軽量メンバー機構。
-- Supabase の SQL Editor に貼って実行する。
-- =====================================================================

-- ========== members テーブル ==========
create table if not exists public.members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null default '#0c8c8b',
  created_at timestamptz not null default now()
);

-- ========== RLS（合言葉方式・少人数の信頼チーム前提：anon/authenticated 全許可） ==========
alter table public.members enable row level security;

drop policy if exists "members all" on public.members;
create policy "members all"
  on public.members for all to anon, authenticated using (true) with check (true);

-- ========== 既存の外部キー制約を外す（profiles 参照を解除） ==========
alter table public.call_logs drop constraint if exists call_logs_user_id_fkey;
alter table public.clinics   drop constraint if exists clinics_assigned_to_fkey;

-- call_logs.user_id は元々 NOT NULL（profiles 前提）。合言葉方式では未記名もありうるので nullable に。
alter table public.call_logs alter column user_id drop not null;

-- ========== members への FK を張り直す ==========
-- user_id / assigned_to は uuid・nullable のまま、参照先を members に切り替える。
-- これにより PostgREST が members を embed できる
-- （select("*, members:assigned_to(name,color)") / call_logs では members:user_id(...)）。
-- 既存データに members に無い id が残っていると失敗するため、まず孤児を NULL に掃除する。
update public.clinics   set assigned_to = null
  where assigned_to is not null
    and assigned_to not in (select id from public.members);
update public.call_logs set user_id = null
  where user_id is not null
    and user_id not in (select id from public.members);

alter table public.clinics
  add constraint clinics_assigned_to_fkey
  foreign key (assigned_to) references public.members(id) on delete set null;
alter table public.call_logs
  add constraint call_logs_user_id_fkey
  foreign key (user_id) references public.members(id) on delete set null;

-- ========== Realtime 配信対象（任意） ==========
-- alter publication supabase_realtime add table public.members;
