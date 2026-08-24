-- Two more staff_details fields: a personal ID document (cédula/pasaporte,
-- sensitive PII) and a birth date (for a future birthday-reminder feature —
-- just capturing the date here, no alerting logic yet).
--
-- Document storage is private — only the owner can read/write it, same as
-- the rest of staff_details; the avatars/attachments buckets are public
-- because photos aren't sensitive the same way.

alter table public.staff_details
  add column id_document_path text,
  add column birth_date date;

insert into storage.buckets (id, name, public, file_size_limit)
values ('staff-documents', 'staff-documents', false, 10485760)
on conflict (id) do nothing;

create policy "staff_documents_owner_only" on storage.objects
  for all using (
    bucket_id = 'staff-documents' and public.is_owner()
  )
  with check (
    bucket_id = 'staff-documents' and public.is_owner()
  );
