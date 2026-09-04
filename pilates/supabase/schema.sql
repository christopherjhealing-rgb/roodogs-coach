-- Bloom Pilates: run this once in the Supabase SQL editor (Database -> SQL).
-- Every table is private per instructor via row-level security.

create extension if not exists "pgcrypto";

-- Instructor profile (one row per auth user, created automatically).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Instructor-created movements. The shared seed library ships with the app,
-- so this table only holds each instructor's own additions and edited copies.
create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  discipline text not null check (discipline in ('mat', 'reformer', 'barre')),
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  focus jsonb not null default '[]'::jsonb,
  equipment jsonb not null default '[]'::jsonb,
  description text not null default '',
  cues jsonb not null default '[]'::jsonb,
  modifications jsonb not null default '[]'::jsonb,
  contraindications jsonb not null default '[]'::jsonb,
  springs text,
  default_duration_sec integer,
  default_reps text,
  tags jsonb not null default '[]'::jsonb,
  diagram_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Existing installs: copies of seed movements keep the seed's diagram.
alter table public.movements add column if not exists diagram_id text;

create table if not exists public.lesson_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  discipline text not null check (discipline in ('mat', 'reformer', 'barre')),
  level text not null check (level in ('beginner', 'intermediate', 'advanced')),
  target_minutes integer not null default 45,
  sections jsonb not null default '[]'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A class that was taught, logged on the calendar.
create table if not exists public.class_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  time text,
  plan_id uuid references public.lesson_plans (id) on delete set null,
  title text not null,
  discipline text not null check (discipline in ('mat', 'reformer', 'barre')),
  location text,
  attendees integer,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists movements_owner_idx on public.movements (owner_id);
create index if not exists lesson_plans_owner_idx on public.lesson_plans (owner_id, updated_at desc);
create index if not exists class_logs_owner_date_idx on public.class_logs (owner_id, date);

alter table public.profiles enable row level security;
alter table public.movements enable row level security;
alter table public.lesson_plans enable row level security;
alter table public.class_logs enable row level security;

drop policy if exists "profiles: own row" on public.profiles;
create policy "profiles: own row" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "movements: own rows" on public.movements;
create policy "movements: own rows" on public.movements
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "lesson_plans: own rows" on public.lesson_plans;
create policy "lesson_plans: own rows" on public.lesson_plans
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "class_logs: own rows" on public.class_logs;
create policy "class_logs: own rows" on public.class_logs
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
