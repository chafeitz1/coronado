-- Guest-day routine: a fixed, owner-managed timeline of times + what to do
-- at each (set up the beach tent, sweep the deck, close up at night...).
-- Read-only for staff — no assignment, no completion tracking, no photos,
-- just a scheduled push reminder at the right time. Only fires on days
-- marked "guests present" via house_occupancy below.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table public.routine_items (
  id uuid primary key default gen_random_uuid(),
  time time not null,
  title text not null,
  steps text,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

alter table public.routine_items enable row level security;

create policy routine_items_select on public.routine_items
for select using (is_owner() or "current_role"() = 'staff');

create policy routine_items_insert on public.routine_items
for insert with check (is_owner());

create policy routine_items_update on public.routine_items
for update using (is_owner());

create policy routine_items_delete on public.routine_items
for delete using (is_owner());

-- Singleton row — whoever's on site (staff or owner) flips this when
-- guests/residents arrive or leave; the timeline view and the reminder
-- cron both key off it, so nothing fires on an empty house.
create table public.house_occupancy (
  id int primary key default 1,
  guests_present boolean not null default false,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  constraint house_occupancy_singleton check (id = 1)
);

insert into public.house_occupancy (id, guests_present) values (1, false);

alter table public.house_occupancy enable row level security;

create policy house_occupancy_select on public.house_occupancy
for select using (is_owner() or "current_role"() = 'staff');

create policy house_occupancy_update on public.house_occupancy
for update using (is_owner() or "current_role"() = 'staff');

-- Dedup log for the reminder cron (one row per item per calendar day it
-- fired) — admin-client only, no client-facing policies: RLS enabled with
-- no policy denies all access from the anon/authenticated roles, while the
-- service role the cron route uses bypasses RLS entirely.
create table public.routine_item_sends (
  routine_item_id uuid not null references public.routine_items(id) on delete cascade,
  sent_date date not null,
  sent_at timestamptz not null default now(),
  primary key (routine_item_id, sent_date)
);

alter table public.routine_item_sends enable row level security;
