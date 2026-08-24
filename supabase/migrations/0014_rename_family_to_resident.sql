-- "Family" only fit the original nuclear-family picture. "Resident" covers
-- whoever actually lives at the house day to day, and the invite form can
-- now grant the "owner" role too (e.g. a co-owner), not just staff/resident.

update public.profiles set role = 'resident' where role = 'family';

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('owner', 'resident', 'staff'));

create or replace function public.handle_new_user()
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
      case when (select count(*) from public.profiles) = 0 then 'owner' else 'resident' end
    )
  );
  return new;
end;
$$;

drop policy "work_orders_select" on public.work_orders;
create policy "work_orders_select" on public.work_orders
  for select using (
    public.is_owner()
    or public.current_role() = 'resident'
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  );

-- Current live definition of work_orders_insert (0005_recurring_tasks.sql
-- added the recurrence check on top of 0001's version) — replicated here
-- with 'resident' swapped in.
drop policy "work_orders_insert" on public.work_orders;
create policy "work_orders_insert" on public.work_orders
  for insert with check (
    public.is_owner()
    or (
      public.current_role() = 'resident'
      and source = 'manual'
      and created_by = auth.uid()
      and recurrence_interval_value is null
    )
  );
