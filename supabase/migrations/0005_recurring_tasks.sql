-- Fold "preventive maintenance" into a single Tareas list: recurrence is
-- now just a property you set when creating a work order, instead of a
-- separate template that lives in its own table/screen. pm_schedules has
-- 0 rows in production, so this is a clean cut-over — nothing to migrate.

alter table public.work_orders drop column if exists pm_schedule_id;
drop table if exists public.pm_schedules cascade;

alter table public.work_orders
  add column recurrence_interval_value int,
  add column recurrence_interval_unit text;

alter table public.work_orders
  add constraint work_orders_recurrence_unit_check check (
    recurrence_interval_unit is null or recurrence_interval_unit in ('days', 'weeks', 'months', 'years')
  );

-- Both fields present or both absent — no half-set recurrence.
alter table public.work_orders
  add constraint work_orders_recurrence_pair_check check (
    (recurrence_interval_value is null) = (recurrence_interval_unit is null)
  );

-- Family can still only create one-time work orders — now enforced at the
-- database level that they can't sneak recurrence in too.
drop policy "work_orders_insert" on public.work_orders;
create policy "work_orders_insert" on public.work_orders
  for insert with check (
    public.is_owner()
    or (
      public.current_role() = 'family'
      and source = 'manual'
      and created_by = auth.uid()
      and recurrence_interval_value is null
    )
  );
