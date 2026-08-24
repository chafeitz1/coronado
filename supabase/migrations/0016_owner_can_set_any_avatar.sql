-- The avatars bucket's existing policies (0006) only let a user write into
-- their own {user_id}/ folder. The Directory now lets the owner set anyone's
-- photo by clicking their avatar, so the owner needs write access to every
-- folder too — added as extra permissive policies (RLS OR's them together)
-- rather than touching the existing self-service ones.

create policy "avatars_owner_insert_any_folder" on storage.objects
  for insert with check (bucket_id = 'avatars' and public.is_owner());

create policy "avatars_owner_update_any_folder" on storage.objects
  for update using (bucket_id = 'avatars' and public.is_owner());

create policy "avatars_owner_delete_any_folder" on storage.objects
  for delete using (bucket_id = 'avatars' and public.is_owner());
