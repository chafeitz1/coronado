-- Track staff salary as a history of dated changes instead of a single
-- value that gets overwritten, so a future payroll view can show what
-- changed and when. Owner-only, same as the rest of staff_details.

alter table public.staff_details drop column if exists salary;

create table public.staff_salary_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  salary numeric(10, 2) not null,
  effective_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.staff_salary_history enable row level security;

create policy "staff_salary_history_owner_only" on public.staff_salary_history
  for all using (public.is_owner()) with check (public.is_owner());

create index staff_salary_history_user_id_idx on public.staff_salary_history (user_id, effective_date desc);
