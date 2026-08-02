-- Coronado maintenance tool: core schema + RLS
-- Roles: owner (full control), family (view + create one-time work orders),
-- staff (sees/handles assigned work orders). Vendors are directory-only, never accounts.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('owner', 'family', 'staff')),
  phone text,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so RLS policies can check the caller's role without
-- recursing back into profiles' own RLS.
create function public.current_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.is_owner()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select role from public.profiles where id = auth.uid()) = 'owner', false);
$$;

alter table public.profiles enable row level security;

-- Everyone can see names/roles of other household accounts (small trusted
-- group; needed to show "assigned to" on work orders). Only the owner
-- manages accounts; users may edit their own contact info.
create policy "profiles_select_all" on public.profiles
  for select using (true);

create policy "profiles_insert_owner" on public.profiles
  for insert with check (public.is_owner());

create policy "profiles_update_owner_or_self" on public.profiles
  for update using (public.is_owner() or id = auth.uid());

create policy "profiles_delete_owner" on public.profiles
  for delete using (public.is_owner());

-- When the owner invites someone (Supabase Auth admin inviteUserByEmail),
-- full_name/role are passed as user metadata and copied into profiles here.
-- The very first user to ever sign up has no inviter and becomes 'owner'.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(
      new.raw_user_meta_data ->> 'role',
      case when (select count(*) from public.profiles) = 0 then 'owner' else 'family' end
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- vendors (directory only, no login)
-- ---------------------------------------------------------------------------
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trade text,
  phone text,
  email text,
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.vendors enable row level security;

create policy "vendors_select_all" on public.vendors
  for select using (true);

create policy "vendors_write_owner" on public.vendors
  for all using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- assets (equipment inventory)
-- ---------------------------------------------------------------------------
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  location text,
  purchase_date date,
  warranty_expires date,
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.assets enable row level security;

create policy "assets_select_all" on public.assets
  for select using (true);

create policy "assets_write_owner" on public.assets
  for all using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- pm_schedules (preventive maintenance recurrence rules; owner-only)
-- ---------------------------------------------------------------------------
create table public.pm_schedules (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets (id) on delete cascade,
  title text not null,
  description text,
  interval_unit text not null check (interval_unit in ('days', 'weeks', 'months', 'years')),
  interval_value int not null check (interval_value > 0),
  next_due_date date not null,
  default_assignee uuid references public.profiles (id),
  active boolean not null default true,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.pm_schedules enable row level security;

create policy "pm_schedules_owner_only" on public.pm_schedules
  for all using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- work_orders
-- ---------------------------------------------------------------------------
create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  asset_id uuid references public.assets (id) on delete set null,
  vendor_id uuid references public.vendors (id) on delete set null,
  assigned_to uuid references public.profiles (id) on delete set null,
  created_by uuid not null references public.profiles (id),
  due_date date,
  completed_at timestamptz,
  source text not null default 'manual' check (source in ('manual', 'pm')),
  pm_schedule_id uuid references public.pm_schedules (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index work_orders_assigned_to_idx on public.work_orders (assigned_to);
create index work_orders_status_idx on public.work_orders (status);

alter table public.work_orders enable row level security;

-- Owner and family see everything; staff only see what's assigned to them
-- or that they created themselves.
create policy "work_orders_select" on public.work_orders
  for select using (
    public.is_owner()
    or public.current_role() = 'family'
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  );

-- Owner can create anything (any source/assignee). Family can only create
-- one-time (manual) orders, attributed to themselves. Staff don't create
-- work orders in the MVP (they only work the ones assigned to them).
create policy "work_orders_insert" on public.work_orders
  for insert with check (
    public.is_owner()
    or (
      public.current_role() = 'family'
      and source = 'manual'
      and created_by = auth.uid()
    )
  );

-- Owner can update anything. Staff can only update status/notes-adjacent
-- fields on work orders assigned to them (enforced further in the app
-- layer; RLS just scopes which rows they can touch).
create policy "work_orders_update" on public.work_orders
  for update using (
    public.is_owner()
    or assigned_to = auth.uid()
  );

create policy "work_orders_delete_owner" on public.work_orders
  for delete using (public.is_owner());

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger work_orders_set_updated_at
  before update on public.work_orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- work_order_notes
-- ---------------------------------------------------------------------------
create table public.work_order_notes (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  author_id uuid not null references public.profiles (id),
  body text not null,
  notify_owner boolean not null default false,
  created_at timestamptz not null default now()
);

create index work_order_notes_work_order_id_idx on public.work_order_notes (work_order_id);

alter table public.work_order_notes enable row level security;

-- A note is visible/writable by anyone who can see the parent work order.
create policy "work_order_notes_select" on public.work_order_notes
  for select using (
    exists (
      select 1 from public.work_orders wo
      where wo.id = work_order_id
    )
  );

create policy "work_order_notes_insert" on public.work_order_notes
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.work_orders wo
      where wo.id = work_order_id
    )
  );

-- ---------------------------------------------------------------------------
-- attachments (photos/docs on a work order or an asset)
-- ---------------------------------------------------------------------------
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid references public.work_orders (id) on delete cascade,
  asset_id uuid references public.assets (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  uploaded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint attachments_parent_check check (
    (work_order_id is not null and asset_id is null)
    or (work_order_id is null and asset_id is not null)
  )
);

alter table public.attachments enable row level security;

create policy "attachments_select" on public.attachments
  for select using (true);

create policy "attachments_insert" on public.attachments
  for insert with check (uploaded_by = auth.uid());

create policy "attachments_delete_owner" on public.attachments
  for delete using (public.is_owner() or uploaded_by = auth.uid());

-- ---------------------------------------------------------------------------
-- notification_preferences (owner configures per staff/family member;
-- also doubles as the owner's own "notify me by email on flagged notes"
-- toggle via event_type = 'note_flagged')
-- ---------------------------------------------------------------------------
create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (
    event_type in ('task_assigned', 'status_changed', 'due_soon', 'overdue', 'note_flagged')
  ),
  channel text not null check (channel in ('push', 'email')),
  enabled boolean not null default true,
  unique (user_id, event_type, channel)
);

alter table public.notification_preferences enable row level security;

create policy "notification_preferences_select" on public.notification_preferences
  for select using (public.is_owner() or user_id = auth.uid());

create policy "notification_preferences_write" on public.notification_preferences
  for all using (public.is_owner() or user_id = auth.uid())
  with check (public.is_owner() or user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- push_subscriptions (Web Push)
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_owner_row" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
