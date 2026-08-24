-- Vendors can now have a photo/logo too, uploaded by the owner the same
-- way as a person's avatar (click to upload, reusing the public avatars
-- bucket under a vendor-{id}/ folder — already writable by the owner from
-- any folder per migration 0016).

alter table public.vendors add column avatar_url text;
