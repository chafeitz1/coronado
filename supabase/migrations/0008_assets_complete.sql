-- Round out the "activos" module: identifying details for service calls,
-- a preferred vendor per asset, and a Storage bucket for asset photos
-- (the attachments table already supported asset_id, just wasn't used yet).

alter table public.assets
  add column brand text,
  add column model text,
  add column serial_number text,
  add column preferred_vendor_id uuid references public.vendors (id) on delete set null;

insert into storage.buckets (id, name, public, file_size_limit)
values ('attachments', 'attachments', true, 5242880)
on conflict (id) do nothing;

-- Path convention: {asset_id}/{uploader_id}/{filename} — mirrors the
-- attachments table's own policies (anyone can attach, owner or the
-- uploader can remove).
create policy "attachments_bucket_select_all" on storage.objects
  for select using (bucket_id = 'attachments');

create policy "attachments_bucket_insert" on storage.objects
  for insert with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "attachments_bucket_delete" on storage.objects
  for delete using (
    bucket_id = 'attachments'
    and (public.is_owner() or (storage.foldername(name))[2] = auth.uid()::text)
  );
