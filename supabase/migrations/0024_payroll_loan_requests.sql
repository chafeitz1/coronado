-- Solicitud de dinero: a request/approval step before a préstamo/adelanto
-- becomes a real, disbursed payroll_loans row. Owner-only, same as the rest
-- of Planilla — logged by the owner when an employee asks, not a
-- staff-facing form.

create table public.payroll_loan_requests (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('prestamo', 'adelanto')),
  amount numeric(10, 2) not null,
  request_date date not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes text,
  loan_id uuid references public.payroll_loans (id) on delete set null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.payroll_loan_requests enable row level security;

create policy "payroll_loan_requests_owner_only" on public.payroll_loan_requests
  for all using (public.is_owner()) with check (public.is_owner());

create index payroll_loan_requests_person_id_idx on public.payroll_loan_requests (person_id);
