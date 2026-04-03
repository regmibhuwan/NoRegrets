-- Legacy `decisions` tables may omit columns the app expects (CREATE TABLE IF NOT EXISTS never alters).
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

create index if not exists decisions_follow_up_idx on public.decisions (user_id, follow_up_date);
create index if not exists decisions_status_idx on public.decisions (user_id, status);
create index if not exists decisions_category_idx on public.decisions (user_id, category);
