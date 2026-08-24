-- Hire date + current salary for staff, kept out of public.profiles (which
-- any authenticated user can read) since payroll info is owner-only. This
-- is a snapshot of the current salary, not a history — a payroll feature
-- can layer a proper ledger on top of this later if needed.

create table public.staff_details (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  hire_date date,
  salary numeric(10, 2),
  updated_at timestamptz not null default now()
);

alter table public.staff_details enable row level security;

create policy "staff_details_owner_only" on public.staff_details
  for all using (public.is_owner()) with check (public.is_owner());
