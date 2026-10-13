-- Planilla rebuilt on the Atlas/Ebony payroll model: money in integer cents,
-- one generic ledger (loans/advances + their installments) hooked to the
-- real quincena rows, "paid" tracked per quincena. Converts the dollar
-- tables from 0023/0025 in place (ids preserved), so nothing is lost.
-- Owner-only end to end, same as the rest of Planilla.

-- ── payroll_entries: dollars -> cents, person_id -> employee_id ─────────
alter table public.payroll_entries rename column person_id to employee_id;

alter table public.payroll_entries alter column base_pay drop default;
alter table public.payroll_entries alter column base_pay type bigint using round(base_pay * 100)::bigint;
alter table public.payroll_entries alter column base_pay set default 0;
alter table public.payroll_entries rename column base_pay to base_pay_cents;

alter table public.payroll_entries alter column extra_hours_amount drop default;
alter table public.payroll_entries alter column extra_hours_amount type bigint using round(extra_hours_amount * 100)::bigint;
alter table public.payroll_entries alter column extra_hours_amount set default 0;
alter table public.payroll_entries rename column extra_hours_amount to extra_hours_cents;

alter table public.payroll_entries alter column extra_days_amount drop default;
alter table public.payroll_entries alter column extra_days_amount type bigint using round(extra_days_amount * 100)::bigint;
alter table public.payroll_entries alter column extra_days_amount set default 0;
alter table public.payroll_entries rename column extra_days_amount to extra_days_cents;

alter table public.payroll_entries alter column bonus drop default;
alter table public.payroll_entries alter column bonus type bigint using round(bonus * 100)::bigint;
alter table public.payroll_entries alter column bonus set default 0;
alter table public.payroll_entries rename column bonus to bonus_cents;

alter table public.payroll_entries alter column dias_libres drop default;
alter table public.payroll_entries alter column dias_libres type bigint using round(dias_libres * 100)::bigint;
alter table public.payroll_entries alter column dias_libres set default 0;
alter table public.payroll_entries rename column dias_libres to dias_libres_cents;

alter table public.payroll_entries alter column horas_descontadas_amount drop default;
alter table public.payroll_entries alter column horas_descontadas_amount type bigint using round(horas_descontadas_amount * 100)::bigint;
alter table public.payroll_entries alter column horas_descontadas_amount set default 0;
alter table public.payroll_entries rename column horas_descontadas_amount to horas_descontadas_cents;

alter table public.payroll_entries alter column dias_descontados_amount drop default;
alter table public.payroll_entries alter column dias_descontados_amount type bigint using round(dias_descontados_amount * 100)::bigint;
alter table public.payroll_entries alter column dias_descontados_amount set default 0;
alter table public.payroll_entries rename column dias_descontados_amount to dias_descontados_cents;

alter table public.payroll_entries alter column other_deduction drop default;
alter table public.payroll_entries alter column other_deduction type bigint using round(other_deduction * 100)::bigint;
alter table public.payroll_entries alter column other_deduction set default 0;
alter table public.payroll_entries rename column other_deduction to other_deduction_cents;

alter table public.payroll_entries alter column decimo_paid drop default;
alter table public.payroll_entries alter column decimo_paid type bigint using round(decimo_paid * 100)::bigint;
alter table public.payroll_entries alter column decimo_paid set default 0;
alter table public.payroll_entries rename column decimo_paid to decimo_paid_cents;

alter table public.payroll_entries alter column vacation_paid drop default;
alter table public.payroll_entries alter column vacation_paid type bigint using round(vacation_paid * 100)::bigint;
alter table public.payroll_entries alter column vacation_paid set default 0;
alter table public.payroll_entries rename column vacation_paid to vacation_paid_cents;

alter table public.payroll_entries alter column prima_paid drop default;
alter table public.payroll_entries alter column prima_paid type bigint using round(prima_paid * 100)::bigint;
alter table public.payroll_entries alter column prima_paid set default 0;
alter table public.payroll_entries rename column prima_paid to prima_antiguedad_paid_cents;

alter table public.payroll_entries add column viaticos_cents bigint not null default 0;
alter table public.payroll_entries add column paid boolean not null default false;
alter table public.payroll_entries add column paid_at timestamptz;

-- created_by defaults to the signed-in owner so the service layer needn't pass it.
alter table public.payroll_entries alter column created_by drop not null;
alter table public.payroll_entries alter column created_by set default auth.uid();

-- ── payroll_loans: dollars -> cents, new column names ───────────────────
alter table public.payroll_loans rename column person_id to employee_id;
alter table public.payroll_loans alter column principal_amount type bigint using round(principal_amount * 100)::bigint;
alter table public.payroll_loans rename column principal_amount to principal_cents;
alter table public.payroll_loans rename column start_year to start_period_year;
alter table public.payroll_loans rename column start_month to start_period_month;
alter table public.payroll_loans rename column start_half to start_period_half;
alter table public.payroll_loans
  add column payment_method text not null default 'cuota_fija'
  check (payment_method in ('cuota_fija', 'cuota_variable'));
alter table public.payroll_loans alter column created_by drop not null;
alter table public.payroll_loans alter column created_by set default auth.uid();

-- ── payroll_ledger_entries: the generic debt/payment ledger ─────────────
-- A loan creates one 'debt' row (the amount given) plus one 'payment' row
-- per installment, each hooked (payroll_entry_id) to that quincena's real
-- payroll_entries row. seguro_social is informational only.
create table public.payroll_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('prestamo', 'adelanto', 'seguro_social', 'carnet', 'otro')),
  direction text not null check (direction in ('debt', 'payment')),
  amount_cents bigint not null,
  entry_date date not null,
  payroll_entry_id uuid references public.payroll_entries (id) on delete cascade,
  loan_id uuid references public.payroll_loans (id) on delete cascade,
  notes text,
  created_by uuid default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.payroll_ledger_entries enable row level security;

create policy "payroll_ledger_entries_owner_only" on public.payroll_ledger_entries
  for all using (public.is_owner()) with check (public.is_owner());

create index payroll_ledger_entries_employee_idx on public.payroll_ledger_entries (employee_id, entry_date);
create index payroll_ledger_entries_entry_idx on public.payroll_ledger_entries (payroll_entry_id);
create index payroll_ledger_entries_loan_idx on public.payroll_ledger_entries (loan_id);

-- Carry over what already exists: each loan's principal becomes a 'debt'
-- row, each logged payment a 'payment' row (no quincena -> counts as
-- already realized). Installment schedules were never stored, so none are
-- materialized for old loans.
insert into public.payroll_ledger_entries (employee_id, category, direction, amount_cents, entry_date, loan_id, notes, created_by)
select employee_id, category, 'debt', principal_cents, request_date, id, notes, created_by
from public.payroll_loans;

insert into public.payroll_ledger_entries (employee_id, category, direction, amount_cents, entry_date, loan_id, notes, created_by)
select l.employee_id, l.category, 'payment', round(p.amount * 100)::bigint, p.payment_date, l.id, p.notes, p.created_by
from public.payroll_loan_payments p
join public.payroll_loans l on l.id = p.loan_id;

drop table public.payroll_loan_payments;

-- ── staff_details: the two benefits fields Planilla needs ───────────────
-- Salary itself stays in staff_salary_history (single source of truth).
alter table public.staff_details add column benefits_base_salary_cents bigint;
alter table public.staff_details add column liquidation_notes text;
