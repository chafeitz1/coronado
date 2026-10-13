-- Anuncios: owner posts a heads-up about an upcoming vendor visit or
-- delivery (a specific day or a date range) — creating one notifies every
-- staff member (push + email) so they're expecting it. Once it actually
-- happens, whoever's there marks it, which pings the owner back the same
-- way. Kept as a lasting record afterward — learned from purchase_items:
-- delete is owner-only here from the start, not requester-or-owner, since
-- only the owner ever creates one of these in the first place.

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  start_date date not null,
  end_date date,
  status text not null default 'pending' check (status in ('pending', 'happened')),
  created_by uuid not null references public.profiles (id),
  happened_by uuid references public.profiles (id),
  happened_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

-- Small trusted household — everyone sees the same list (staff need it to
-- know what's coming; owner/residents can see it too).
create policy "announcements_select_all" on public.announcements
  for select using (true);

create policy "announcements_insert_owner" on public.announcements
  for insert with check (public.is_owner() and created_by = auth.uid());

-- Anyone can mark one as happened (staff on-site, most often) or undo a
-- mistaken mark — doesn't wait on the owner to confirm.
create policy "announcements_update_all" on public.announcements
  for update using (auth.uid() is not null);

create policy "announcements_delete_owner" on public.announcements
  for delete using (public.is_owner());

alter table public.notification_preferences
  drop constraint notification_preferences_event_type_check;

alter table public.notification_preferences
  add constraint notification_preferences_event_type_check
  check (event_type in (
    'task_assigned', 'status_changed', 'due_soon', 'overdue', 'note_flagged',
    'purchase_urgent', 'daily_digest', 'maintenance_reminder',
    'announcement_created', 'announcement_happened'
  ));
