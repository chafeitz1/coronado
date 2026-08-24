-- Denormalize auth.users.email onto profiles so the app (which only ever
-- queries the public schema, not auth) can show it in the Directory
-- alongside phone — same pattern as full_name being copied in at signup.

alter table public.profiles add column email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(
      new.raw_user_meta_data ->> 'role',
      case when (select count(*) from public.profiles) = 0 then 'owner' else 'resident' end
    ),
    new.email
  );
  return new;
end;
$$;
