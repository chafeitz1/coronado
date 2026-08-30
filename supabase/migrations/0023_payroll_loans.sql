-- Préstamos/adelantos ledger. The amortization schedule itself is never
-- stored (computed live via computeLoanSchedule) — only the loan terms and
-- the real payments actually logged against it, same "never store what can
-- drift" discipline as the rest of expenses/staff_salary_history.

create table public.payroll_loans (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('prestamo', 'adelanto')),
  principal_amount numeric(10, 2) not null,
  num_installments integer not null check (num_installments >= 1),
  request_date date not null,
  start_year integer not null,
  start_month integer not null,
  start_half integer not null check (start_half in (1, 2)),
  status text not null default 'active' check (status in ('active', 'cancelled')),
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.payroll_loans enable row level security;

create policy "payroll_loans_owner_only" on public.payroll_loans
  for all using (public.is_owner()) with check (public.is_owner());

create index payroll_loans_person_id_idx on public.payroll_loans (person_id);

create table public.payroll_loan_payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.payroll_loans (id) on delete cascade,
  amount numeric(10, 2) not null,
  payment_date date not null,
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.payroll_loan_payments enable row level security;

create policy "payroll_loan_payments_owner_only" on public.payroll_loan_payments
  for all using (public.is_owner()) with check (public.is_owner());

create index payroll_loan_payments_loan_id_idx on public.payroll_loan_payments (loan_id);

-- Links a loan to the expenses-ledger row that represents its disbursement,
-- so the loan shows up in the person's normal payment timeline too.
alter table public.expenses add column loan_id uuid references public.payroll_loans (id) on delete set null;
