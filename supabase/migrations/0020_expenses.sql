-- General-purpose expense ledger. Planilla (payroll) is the first category;
-- category/subcategory stay free text (like assets.category, vendors.trades)
-- so future categories (mantenimiento, equipos, suscripciones...) need no
-- schema change, just new values. Owner-only end to end, same as
-- staff_salary_history: select is gated too, not just writes.

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  category text not null,
  subcategory text,
  amount numeric(10, 2) not null,
  expected_amount numeric(10, 2),
  person_id uuid references public.profiles (id) on delete set null,
  vendor_id uuid references public.vendors (id) on delete set null,
  asset_id uuid references public.assets (id) on delete set null,
  payment_method text,
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

create policy "expenses_owner_only" on public.expenses
  for all using (public.is_owner()) with check (public.is_owner());

create index expenses_category_date_idx on public.expenses (category, date desc);
create index expenses_person_id_idx on public.expenses (person_id, date desc);
