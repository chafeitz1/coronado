-- Compras (purchase items): staff/owner/residents log things that need to
-- be bought. "groceries" items accumulate into a list that gets copied/sent
-- to whoever is shopping in one batch; "urgent" items are one-off and
-- notify the owner immediately instead of waiting to be batched.

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  quantity text,
  notes text,
  list_type text not null check (list_type in ('groceries', 'urgent')),
  status text not null default 'pending' check (status in ('pending', 'purchased')),
  requested_by uuid not null references public.profiles (id),
  purchased_by uuid references public.profiles (id),
  purchased_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.purchase_items enable row level security;

-- Small trusted household — everyone with an account sees the same list.
create policy "purchase_items_select_all" on public.purchase_items
  for select using (true);

create policy "purchase_items_insert_self" on public.purchase_items
  for insert with check (requested_by = auth.uid());

-- Anyone can mark an item purchased as soon as they buy it — doesn't wait
-- on the owner to confirm.
create policy "purchase_items_update_all" on public.purchase_items
  for update using (auth.uid() is not null);

create policy "purchase_items_delete" on public.purchase_items
  for delete using (public.is_owner() or requested_by = auth.uid());

-- New notification event: an urgent purchase item pings the owner right
-- away, same mechanism as task_assigned etc.
alter table public.notification_preferences
  drop constraint notification_preferences_event_type_check;

alter table public.notification_preferences
  add constraint notification_preferences_event_type_check
  check (event_type in ('task_assigned', 'status_changed', 'due_soon', 'overdue', 'note_flagged', 'purchase_urgent'));
