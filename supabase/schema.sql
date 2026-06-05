-- =====================================================================
-- 歯科医院 架電CRM（Dentia） スキーマ
-- 設計書 §2-4 のDDLをそのまま反映。Supabase の SQL Editor に貼って実行する。
-- =====================================================================

-- ========== テーブル ==========
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  created_at   timestamptz not null default now()
);

create table if not exists public.clinics (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  phone          text,
  address        text,
  prefecture     text,
  city           text,
  business_hours text,
  hours          jsonb not null default '{}'::jsonb,
  status         text not null default 'not_called'
                 check (status in ('not_called','no_answer','unavailable','heard','appointment','rejected')),
  assigned_to    uuid references public.profiles(id) on delete set null,
  next_action_at timestamptz,
  latest_memo    text,
  source         text default 'google',
  external_id    text unique,  -- 外部データ取り込み時の元ID（厚労省オープンデータの「ID」等）。再取込の冪等キー。
  -- 電話番号補完（Places連携）用
  lat            double precision, -- 緯度（厚労省データ由来。Places候補との距離照合に使う）
  lng            double precision, -- 経度
  place_id       text,             -- Google Place ID（保存が許容される唯一のPlacesフィールド）
  phone_source   text,             -- 電話番号の取得元: 'manual' | 'places' | 'mhlw' 等
  phone_verified boolean not null default false, -- 人が確認済みか
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- 既存DBへの後方互換（schema.sql を再実行すれば列が追加される）
alter table public.clinics add column if not exists lat            double precision;
alter table public.clinics add column if not exists lng            double precision;
alter table public.clinics add column if not exists place_id       text;
alter table public.clinics add column if not exists phone_source   text;
alter table public.clinics add column if not exists phone_verified boolean not null default false;

create table if not exists public.call_logs (
  id          uuid primary key default gen_random_uuid(),
  clinic_id   uuid not null references public.clinics(id) on delete cascade,
  user_id     uuid not null references public.profiles(id),
  outcome     text not null
              check (outcome in ('not_called','no_answer','unavailable','heard','appointment','rejected')),
  memo        text,
  created_at  timestamptz not null default now()
);

-- 電話番号 補完の確認キュー（Places候補。人が承認/却下する）
create table if not exists public.phone_candidates (
  id                uuid primary key default gen_random_uuid(),
  clinic_id         uuid not null references public.clinics(id) on delete cascade,
  place_id          text,
  name              text,
  formatted_address text,
  phone             text,
  distance_m        numeric,      -- 厚労省座標とPlaces候補の距離(m)
  name_score        numeric,      -- 名称類似度 0..1
  confidence        numeric,      -- 総合信頼度 0..1
  status            text not null default 'pending'
                    check (status in ('pending','accepted','rejected')),
  created_at        timestamptz not null default now()
);

create index if not exists idx_call_logs_clinic    on public.call_logs(clinic_id);
create index if not exists idx_clinics_status       on public.clinics(status);
create index if not exists idx_clinics_region       on public.clinics(prefecture, city);
create index if not exists idx_phone_cand_status    on public.phone_candidates(status);
create index if not exists idx_phone_cand_clinic    on public.phone_candidates(clinic_id);

-- ========== updated_at 自動更新 ==========
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_clinics_updated_at on public.clinics;
create trigger trg_clinics_updated_at
  before update on public.clinics
  for each row execute function public.set_updated_at();

-- ========== RLS（少人数の信頼チーム前提：認証済みは全件可） ==========
alter table public.profiles         enable row level security;
alter table public.clinics          enable row level security;
alter table public.call_logs        enable row level security;
alter table public.phone_candidates enable row level security;

-- profiles: 全員が閲覧可。書き込みは自分の行のみ（初回ログイン時の upsert 用）
drop policy if exists "auth read profiles" on public.profiles;
create policy "auth read profiles"
  on public.profiles for select to authenticated using (true);

drop policy if exists "auth insert own profile" on public.profiles;
create policy "auth insert own profile"
  on public.profiles for insert to authenticated with check (id = auth.uid());

drop policy if exists "auth update own profile" on public.profiles;
create policy "auth update own profile"
  on public.profiles for update to authenticated using (id = auth.uid());

-- clinics: 認証済みは全件 読み書き可
-- 将来「担当した医院だけ編集」等に絞る場合は using (assigned_to = auth.uid()) に差し替える。
drop policy if exists "auth manage clinics" on public.clinics;
create policy "auth manage clinics"
  on public.clinics for all to authenticated using (true) with check (true);

-- call_logs: 認証済みは全件 閲覧可、追記可（履歴は消さない方針）
drop policy if exists "auth read call_logs" on public.call_logs;
create policy "auth read call_logs"
  on public.call_logs for select to authenticated using (true);

drop policy if exists "auth insert call_logs" on public.call_logs;
create policy "auth insert call_logs"
  on public.call_logs for insert to authenticated with check (user_id = auth.uid());

-- phone_candidates: 認証済みは全件 読み書き可（キューの承認/却下を行う）
drop policy if exists "auth manage phone_candidates" on public.phone_candidates;
create policy "auth manage phone_candidates"
  on public.phone_candidates for all to authenticated using (true) with check (true);

-- ========== Realtime 配信対象に登録 ==========
alter publication supabase_realtime add table public.clinics;
alter publication supabase_realtime add table public.call_logs;

-- UPDATE/DELETE 時に変更前の行情報も配信したい場合（任意）
alter table public.clinics   replica identity full;
alter table public.call_logs replica identity full;
