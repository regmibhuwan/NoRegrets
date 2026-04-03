-- NoRegrets: initial schema + RLS
-- Safe to re-run: skips objects that already exist (IF NOT EXISTS + DROP POLICY IF EXISTS).
-- If your tables exist but columns differ, fix in a new migration or reset the DB in dev.

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  onboarding_complete boolean not null default false,
  reminder_email_enabled boolean not null default true,
  privacy_analytics boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  category text not null default 'other',
  description text,
  expected_outcome text,
  confidence_level int check (confidence_level between 1 and 5),
  urgency text not null default 'medium' check (urgency in ('low', 'medium', 'high')),
  people_involved text,
  decision_date date not null default (current_date),
  follow_up_date date,
  tags text[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'decided', 'revisited', 'regretted', 'satisfied')),
  feeling_at_time text,
  risk_score int check (risk_score between 0 and 100),
  reminder_sent_at timestamptz,
  ai_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing DBs: CREATE TABLE IF NOT EXISTS does not add new columns; keep in sync with app + database.types.
alter table public.decisions add column if not exists category text default 'other';
alter table public.decisions add column if not exists description text;
alter table public.decisions add column if not exists expected_outcome text;
alter table public.decisions add column if not exists confidence_level int;
alter table public.decisions add column if not exists urgency text default 'medium';
alter table public.decisions add column if not exists people_involved text;
alter table public.decisions add column if not exists decision_date date default (current_date);
alter table public.decisions add column if not exists follow_up_date date;
alter table public.decisions add column if not exists tags text[] default '{}'::text[];
alter table public.decisions add column if not exists status text default 'pending';
alter table public.decisions add column if not exists feeling_at_time text;
alter table public.decisions add column if not exists risk_score int;
alter table public.decisions add column if not exists reminder_sent_at timestamptz;
alter table public.decisions add column if not exists ai_summary text;
alter table public.decisions add column if not exists created_at timestamptz default now();
alter table public.decisions add column if not exists updated_at timestamptz default now();

create index if not exists decisions_user_id_idx on public.decisions (user_id);
create index if not exists decisions_follow_up_idx on public.decisions (user_id, follow_up_date);
create index if not exists decisions_status_idx on public.decisions (user_id, status);
create index if not exists decisions_category_idx on public.decisions (user_id, category);

create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  decision_id uuid not null references public.decisions on delete cascade,
  worked_out text not null check (worked_out in ('yes', 'no', 'partially')),
  how_feel_now text,
  what_changed text,
  would_repeat boolean,
  free_notes text,
  sentiment text check (sentiment in ('positive', 'negative', 'mixed', 'neutral')),
  created_at timestamptz not null default now()
);

create index if not exists reflections_decision_idx on public.reflections (decision_id);
create index if not exists reflections_user_idx on public.reflections (user_id);

create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  decision_id uuid references public.decisions on delete set null,
  insight_type text not null,
  title text not null,
  content text not null,
  why_matters text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists ai_insights_user_idx on public.ai_insights (user_id, created_at desc);

-- RLS
alter table public.profiles enable row level security;
alter table public.decisions enable row level security;
alter table public.reflections enable row level security;
alter table public.ai_insights enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "decisions_all_own" on public.decisions;
create policy "decisions_all_own" on public.decisions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reflections_all_own" on public.reflections;
create policy "reflections_all_own" on public.reflections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "ai_insights_all_own" on public.ai_insights;
create policy "ai_insights_all_own" on public.ai_insights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- New user → profile
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists decisions_updated_at on public.decisions;
create trigger decisions_updated_at before update on public.decisions
  for each row execute function public.set_updated_at();
