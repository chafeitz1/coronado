-- The real Registro capture grid: one editable row per (person, quincena),
-- not events derived from the flat expenses ledger. Quincena/décimo/
-- vacación/prima move here entirely; expenses (category='planilla') keeps
-- only adelanto (loan disbursement) and liquidación (one-off settlement).

create table public.payroll_entries (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.profiles (id) on delete cascade,
  period_year integer not null,
  period_month integer not null,
  period_half integer not null check (period_half in (1, 2)),
  base_pay numeric(10, 2) not null default 0,
  extra_hours numeric(6, 2) not null default 0,
  extra_hours_amount numeric(10, 2) not null default 0,
  extra_days numeric(6, 2) not null default 0,
  extra_days_amount numeric(10, 2) not null default 0,
  bonus numeric(10, 2) not null default 0,
  dias_libres numeric(10, 2) not null default 0,
  horas_descontadas numeric(6, 2) not null default 0,
  horas_descontadas_amount numeric(10, 2) not null default 0,
  dias_descontados numeric(6, 2) not null default 0,
  dias_descontados_amount numeric(10, 2) not null default 0,
  other_deduction numeric(10, 2) not null default 0,
  decimo_paid numeric(10, 2) not null default 0,
  vacation_paid numeric(10, 2) not null default 0,
  prima_paid numeric(10, 2) not null default 0,
  payment_method text not null default 'efectivo'
    check (payment_method in ('efectivo', 'transferencia', 'yappy', 'cheque')),
  notes text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id, period_year, period_month, period_half)
);

alter table public.payroll_entries enable row level security;

create policy "payroll_entries_owner_only" on public.payroll_entries
  for all using (public.is_owner()) with check (public.is_owner());

create index payroll_entries_person_period_idx on public.payroll_entries (person_id, period_year, period_month, period_half);

-- Carry forward the only two test rows that exist (Miguel: one quincena,
-- one décimo), both dated 2026-08-15 -> year 2026, month 8, half 1.
insert into public.payroll_entries (person_id, period_year, period_month, period_half, base_pay, decimo_paid, created_by)
select
  e.person_id,
  2026, 8, 1,
  coalesce(max(case when e.subcategory = 'quincena' then e.amount end), 0),
  coalesce(max(case when e.subcategory = 'decimo' then e.amount end), 0),
  (array_agg(e.created_by))[1]
from public.expenses e
where e.category = 'planilla' and e.subcategory in ('quincena', 'decimo') and e.person_id is not null
group by e.person_id
on conflict (person_id, period_year, period_month, period_half) do nothing;

delete from public.expenses where category = 'planilla' and subcategory in ('quincena', 'decimo');
