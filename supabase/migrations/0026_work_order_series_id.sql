-- Links each spawned occurrence of a recurring work order back to the
-- root task, so the detail page can show the full history of past
-- occurrences for the recurring task being viewed. NULL for one-time
-- tasks and for the first (root) occurrence of a recurring one.
alter table work_orders
  add column series_id uuid references work_orders(id) on delete set null;

create index idx_work_orders_series_id on work_orders(series_id) where series_id is not null;
