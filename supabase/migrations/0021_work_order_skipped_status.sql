-- A scheduled/recurring maintenance can be deliberately skipped instead of
-- done. It still needs to stay in the asset's history (not silently
-- disappear), and the recurrence should still advance to the next
-- occurrence — see updateWorkOrderStatus in actions/work-orders.ts.
alter table public.work_orders drop constraint work_orders_status_check;
alter table public.work_orders
  add constraint work_orders_status_check
  check (status in ('open', 'in_progress', 'done', 'skipped'));
