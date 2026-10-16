-- Tracking de Visitas: seguimiento de fines de semana / eventos en la casa
-- de playa (familias, noches, tipo de evento). Reemplaza el Google Sheet.
-- Lectura: dueño y residentes (no personal). Escritura: solo dueño.

create table if not exists public.tracking_events (
  id uuid primary key default gen_random_uuid(),
  evento text not null,
  fecha_ini date not null,
  fecha_salida date,
  tipo text not null default 'Weekend',
  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Una fila por familia x evento.
create table if not exists public.tracking_asistencia (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references public.tracking_events (id) on delete cascade,
  familia text not null,
  noches integer not null default 0,
  llegada date,
  salida date,
  constraint tracking_asistencia_evento_familia unique (evento_id, familia)
);

create index if not exists idx_tracking_events_fecha on public.tracking_events (fecha_ini);
create index if not exists idx_tracking_asistencia_evento on public.tracking_asistencia (evento_id);
create index if not exists idx_tracking_asistencia_familia on public.tracking_asistencia (familia);

create or replace function public.update_tracking_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tracking_events_updated_at on public.tracking_events;
create trigger trg_tracking_events_updated_at
  before update on public.tracking_events
  for each row execute function public.update_tracking_updated_at();

alter table public.tracking_events enable row level security;
alter table public.tracking_asistencia enable row level security;

create policy "tracking_events_read" on public.tracking_events
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'resident')));

create policy "tracking_asistencia_read" on public.tracking_asistencia
  for select to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role in ('owner', 'resident')));

create policy "tracking_events_owner_write" on public.tracking_events
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

create policy "tracking_asistencia_owner_write" on public.tracking_asistencia
  for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
