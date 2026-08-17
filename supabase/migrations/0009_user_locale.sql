-- Per-account language preference. Defaults to 'es' so existing accounts
-- (and new staff/family invites) stay Spanish unless someone opts into
-- English from their profile page.

alter table public.profiles add column locale text not null default 'es';

alter table public.profiles
  add constraint profiles_locale_check check (locale in ('es', 'en'));
