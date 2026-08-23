-- Lets the owner flag a vendor/contact as an emergency contact so it can
-- be filtered to the top of the Directorio (e.g. a boat captain, a friend
-- with local connections — not necessarily a service provider).
alter table public.vendors add column is_emergency boolean not null default false;
