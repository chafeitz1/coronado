-- Personas que trabajaron en la casa y ya no (o que nunca tuvieron cuenta en
-- la app): se guardan solo como DATOS de Planilla — sin usuario, sin correo,
-- sin acceso, y fuera del Directorio. Solo los dueños las ven (is_owner()).
--
-- Planilla ya no obliga a que payroll_entries / payroll_loans /
-- payroll_ledger_entries apunten a un perfil: employee_id puede ser un perfil
-- (personal actual) o una fila de payroll_former_staff. Un trigger valida que
-- exista en uno de los dos y otro limpia las filas si se borra la persona
-- (mismo comportamiento que tenía el ON DELETE CASCADE).

create table if not exists public.payroll_former_staff (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  hire_date date,
  end_date date,
  benefits_base_salary_cents bigint,
  liquidation_notes text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.payroll_former_salary_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.payroll_former_staff (id) on delete cascade,
  salary numeric(10, 2) not null,
  effective_date date not null,
  created_at timestamptz not null default now()
);
create index if not exists payroll_former_salary_history_emp_idx on public.payroll_former_salary_history (employee_id, effective_date);

alter table public.payroll_former_staff enable row level security;
alter table public.payroll_former_salary_history enable row level security;

drop policy if exists "payroll_former_staff_owner_only" on public.payroll_former_staff;
create policy "payroll_former_staff_owner_only" on public.payroll_former_staff
  for all using (public.is_owner()) with check (public.is_owner());
drop policy if exists "payroll_former_salary_history_owner_only" on public.payroll_former_salary_history;
create policy "payroll_former_salary_history_owner_only" on public.payroll_former_salary_history
  for all using (public.is_owner()) with check (public.is_owner());

-- Quitar la llave foránea employee_id -> profiles de las tres tablas de Planilla.
do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname
    from pg_constraint c
    where c.contype = 'f'
      and c.confrelid = 'public.profiles'::regclass
      and c.conrelid in ('public.payroll_entries'::regclass, 'public.payroll_loans'::regclass, 'public.payroll_ledger_entries'::regclass)
      and c.conkey = array[(select a.attnum from pg_attribute a where a.attrelid = c.conrelid and a.attname = 'employee_id')]
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

-- employee_id debe existir como perfil o como persona histórica.
create or replace function public.check_payroll_employee()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = new.employee_id)
     and not exists (select 1 from public.payroll_former_staff where id = new.employee_id) then
    raise exception 'employee_id % no existe en profiles ni en payroll_former_staff', new.employee_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_payroll_employee on public.payroll_entries;
create trigger trg_check_payroll_employee before insert or update of employee_id on public.payroll_entries
  for each row execute function public.check_payroll_employee();
drop trigger if exists trg_check_payroll_employee on public.payroll_loans;
create trigger trg_check_payroll_employee before insert or update of employee_id on public.payroll_loans
  for each row execute function public.check_payroll_employee();
drop trigger if exists trg_check_payroll_employee on public.payroll_ledger_entries;
create trigger trg_check_payroll_employee before insert or update of employee_id on public.payroll_ledger_entries
  for each row execute function public.check_payroll_employee();

-- Al borrar una persona (perfil o histórica) se borran sus datos de Planilla, como antes.
create or replace function public.cleanup_payroll_employee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.payroll_ledger_entries where employee_id = old.id;
  delete from public.payroll_loans where employee_id = old.id;
  delete from public.payroll_entries where employee_id = old.id;
  return old;
end;
$$;

drop trigger if exists trg_cleanup_payroll_employee on public.profiles;
create trigger trg_cleanup_payroll_employee after delete on public.profiles
  for each row execute function public.cleanup_payroll_employee();
drop trigger if exists trg_cleanup_payroll_employee on public.payroll_former_staff;
create trigger trg_cleanup_payroll_employee after delete on public.payroll_former_staff
  for each row execute function public.cleanup_payroll_employee();
