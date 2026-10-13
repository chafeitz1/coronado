-- Command palette search (/api/search) was a plain ilike, which Postgres
-- treats as accent-sensitive by default — searching "electromecanico"
-- (no tilde) wouldn't match "electromecánico". unaccent() strips
-- accents from both the column and the search term before comparing, so
-- either spelling matches either way.
--
-- Wrapped in SQL functions (not a bare ilike in the route) since PostgREST
-- can't apply a function to a column through its normal filter builder —
-- these are the RPC the search route calls instead. security invoker
-- (the default, stated explicitly) so each table's own RLS still applies
-- to whoever's calling it, same as a plain select would.
create extension if not exists unaccent with schema extensions;

create or replace function public.search_work_orders(q text)
returns table (id uuid, title text, status text, due_date date, completed_at timestamptz)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select id, title, status, due_date, completed_at
  from public.work_orders
  where extensions.unaccent(title) ilike extensions.unaccent('%' || q || '%')
  order by title
  limit 5;
$$;

create or replace function public.search_assets(q text)
returns table (id uuid, name text)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select id, name
  from public.assets
  where extensions.unaccent(name) ilike extensions.unaccent('%' || q || '%')
  order by name
  limit 5;
$$;

create or replace function public.search_vendors(q text)
returns table (id uuid, name text)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select id, name
  from public.vendors
  where extensions.unaccent(name) ilike extensions.unaccent('%' || q || '%')
  order by name
  limit 5;
$$;
