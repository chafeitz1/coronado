-- Split a vendor's people out into their own table so a company (e.g.
-- "RefriCool") can have multiple contacts — Gerente, Tecnico, Oficina —
-- without splitting the company into multiple vendor rows. Assets and
-- work orders keep pointing at a single vendor_id no matter how many
-- people work there; the directory panel lists all of a vendor's contacts.

-- The fixed-taxonomy check from 0004 is stale now that trades are
-- free-form text (the frontend has treated them that way since the
-- TagInput refactor — this just catches the DB up).
alter table public.vendors drop constraint if exists vendors_trades_check;

create table public.vendor_contacts (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors (id) on delete cascade,
  contact_name text,
  role_label text,
  phone text,
  email text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.vendor_contacts enable row level security;

create policy "vendor_contacts_select_all" on public.vendor_contacts
  for select using (true);

create policy "vendor_contacts_write_owner" on public.vendor_contacts
  for all using (public.is_owner()) with check (public.is_owner());

create index vendor_contacts_vendor_id_idx on public.vendor_contacts (vendor_id);

-- Carry forward each vendor's existing single contact as contact #0.
insert into public.vendor_contacts (vendor_id, contact_name, phone, email)
select id, contact_name, phone, email
from public.vendors
where contact_name is not null or phone is not null or email is not null;

alter table public.vendors drop column contact_name;
alter table public.vendors drop column phone;
alter table public.vendors drop column email;
