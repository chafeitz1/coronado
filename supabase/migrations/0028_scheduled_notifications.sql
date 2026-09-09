-- Two new time-triggered (not action-triggered) notifications for the
-- owner, run by a daily cron job:
--   - daily_digest: end-of-day summary of tasks due that day + still-open
--     overdue ones.
--   - maintenance_reminder: heads-up ~2 weeks before an asset-maintenance
--     task is due, so the owner can line up whoever does the work.

alter table public.work_orders
  add column maintenance_reminder_sent_at timestamptz;

alter table public.notification_preferences
  drop constraint notification_preferences_event_type_check;

alter table public.notification_preferences
  add constraint notification_preferences_event_type_check
  check (event_type in (
    'task_assigned', 'status_changed', 'due_soon', 'overdue', 'note_flagged',
    'purchase_urgent', 'daily_digest', 'maintenance_reminder'
  ));
