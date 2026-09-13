-- Optional photo on a purchase item, uploaded at creation time — reuses the
-- existing "attachments" storage bucket/policies (path convention
-- purchases/{requested_by}/{filename} already satisfies the bucket's insert
-- policy, which only requires the second path segment to be the uploader's
-- own id).
alter table public.purchase_items
  add column image_path text;
