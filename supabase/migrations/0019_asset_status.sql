-- Assets should never be hard-deleted just because they broke or were
-- thrown out — that erases the maintenance history. status lets an asset
-- move to "inactive" (damaged, disposed, sold...) while keeping its full
-- record; "Borrar" is still available separately for genuine mistakes.

alter table public.assets
  add column status text not null default 'active'
  check (status in ('active', 'inactive'));
