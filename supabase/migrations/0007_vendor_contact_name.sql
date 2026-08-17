-- Vendors are often companies (e.g. "ACME Plomería"); contact_name lets the
-- owner record the specific person to ask for, separate from the business name.

alter table public.vendors add column contact_name text;
