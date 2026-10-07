-- Instructional video link + a separate "instruction" kind of attachment
-- for reference photos, both owner-only — distinct from the existing
-- "evidence" attachments anyone adds while doing the work.

alter table public.work_orders add column video_url text;

alter table public.attachments add column kind text not null default 'evidence';
alter table public.attachments add constraint attachments_kind_check check (kind in ('evidence', 'instruction'));

alter policy attachments_insert on public.attachments
with check (
  (kind = 'evidence' and uploaded_by = auth.uid())
  or (kind = 'instruction' and is_owner() and uploaded_by = auth.uid())
);
