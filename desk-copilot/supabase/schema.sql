-- Plain Money schema (renamed from earlier Desk Copilot / thesis schema).
-- Run in Supabase's SQL editor. RLS assumes single-user (hackathon demo);
-- tighten policies before any multi-user deployment.
--
-- If you already ran the old `theses`/`thesis_id` schema, drop those first:
--   drop table if exists reports;
--   drop table if exists theses;

create table if not exists watches (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  timeframe text not null,
  worry_level text not null check (worry_level in ('not-much', 'somewhat', 'a-lot')),
  note text default '',
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  watch_id uuid references watches(id) on delete set null,
  skills_used text[] not null default '{}',
  headline text not null,
  supporting_signals jsonb not null default '[]',
  risk_flags text[] not null default '{}',
  confidence text not null check (confidence in ('low', 'medium', 'high')),
  raw_skill_results jsonb not null default '[]',
  created_at timestamptz not null default now()
);

alter table watches enable row level security;
alter table reports enable row level security;

create policy "public read/write for hackathon demo" on watches
  for all using (true) with check (true);
create policy "public read/write for hackathon demo" on reports
  for all using (true) with check (true);