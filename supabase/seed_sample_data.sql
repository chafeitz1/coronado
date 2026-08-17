-- Datos de ejemplo para probar Activos y Tareas en Casa Coronado.
-- No es una migración de esquema — solo INSERTs. Se puede correr una
-- sola vez desde el SQL Editor de Supabase. Usa subconsultas para el
-- dueño/personal/proveedores existentes, así que funciona sin importar
-- los IDs reales de tu proyecto.

-- ---------------------------------------------------------------------------
-- Activos
-- ---------------------------------------------------------------------------
insert into public.assets (name, category, location, brand, model, serial_number, preferred_vendor_id, purchase_date, warranty_expires, notes, created_by)
select * from (values
  ('Aire acondicionado sala', 'Aire acondicionado', 'Sala', 'Carrier', '24000 BTU Inverter', 'CR-88213-SL',
    (select id from public.vendors where 'hvac' = any(trades) limit 1),
    date '2023-03-15', date '2026-09-20', 'Revisar filtros cada 3 meses.'),
  ('Aire acondicionado cuarto principal', 'Aire acondicionado', 'Cuarto principal', 'LG', 'Dual Inverter 18000 BTU', 'LG-77120',
    (select id from public.vendors where 'hvac' = any(trades) limit 1),
    date '2024-01-10', date '2027-01-10', null),
  ('Bomba de piscina', 'Piscina', 'Patio', 'Pentair', 'SuperFlo VS', 'PF-33810',
    (select id from public.vendors where 'pool' = any(trades) limit 1),
    date '2022-05-20', date '2026-06-01', 'Cambiar el filtro de arena cada 6 meses.'),
  ('Calentador de agua', 'Plomería', 'Cuarto de máquinas', 'Rheem', 'Marathon 50gal', 'RH-99021',
    (select id from public.vendors where 'plumbing' = any(trades) limit 1),
    date '2021-11-02', null, 'Instalado por el plomero de siempre.'),
  ('Nevera cocina', 'Electrodomésticos', 'Cocina', 'Samsung', 'RF28', 'SM-450912',
    (select id from public.vendors where 'appliances' = any(trades) limit 1),
    date '2023-07-01', date '2028-07-01', null),
  ('Portón vehicular eléctrico', 'Seguridad', 'Entrada', 'LiftMaster', 'CSW24U', 'LM-20293',
    (select id from public.vendors where 'security' = any(trades) limit 1),
    date '2020-09-15', null, 'Control remoto de repuesto en la gaveta de la cocina.'),
  ('Generador eléctrico', 'Electricidad', 'Patio trasero', 'Generac', 'Guardian 22kW', 'GN-58120',
    (select id from public.vendors where 'electrical' = any(trades) limit 1),
    date '2022-02-14', date '2027-02-14', 'Prueba automática los lunes 2pm.'),
  ('Lavadora', 'Electrodomésticos', 'Cuarto de lavado', 'LG', 'WM4000', 'LG-88213W',
    (select id from public.vendors where 'appliances' = any(trades) limit 1),
    date '2024-04-05', null, null)
) as v(name, category, location, brand, model, serial_number, preferred_vendor_id, purchase_date, warranty_expires, notes),
lateral (select id from public.profiles where role = 'owner' order by created_at limit 1) as o(created_by);

-- ---------------------------------------------------------------------------
-- Tareas (work_orders) — mezcla de vencidas, por vencer, hechas y recurrentes
-- ---------------------------------------------------------------------------
with owner as (
  select id from public.profiles where role = 'owner' order by created_at limit 1
),
staffer as (
  select id from public.profiles where role = 'staff' order by created_at limit 1
)
insert into public.work_orders (
  title, description, status, priority, asset_id, assigned_to, created_by,
  due_date, completed_at, recurrence_interval_value, recurrence_interval_unit
)
select
  t.title, t.description, t.status, t.priority,
  (select id from public.assets where name = t.asset_name limit 1),
  case when t.assign then (select id from staffer) else null end,
  (select id from owner),
  t.due_date, t.completed_at, t.recurrence_value, t.recurrence_unit
from (values
  ('Cambiar filtro de A/C sala', null, 'open', 'medium', 'Aire acondicionado sala', true, date '2026-08-10', null::timestamptz, 3, 'months'),
  ('Limpiar filtro de piscina', null, 'open', 'medium', 'Bomba de piscina', true, date '2026-08-22', null::timestamptz, 1, 'months'),
  ('Revisar generador', null, 'open', 'low', 'Generador eléctrico', false, date '2026-08-24', null::timestamptz, 2, 'weeks'),
  ('Fuga de agua en baño de visitas', 'Gotea debajo del lavamanos.', 'in_progress', 'high', null, true, date '2026-08-18', null::timestamptz, null, null),
  ('Pintar fachada', null, 'open', 'low', null, false, date '2026-10-01', null::timestamptz, null, null),
  ('Servicio anual bomba de piscina', null, 'done', 'medium', 'Bomba de piscina', true, date '2026-08-01', timestamptz '2026-08-05 15:00:00', 1, 'years'),
  ('Cambiar control remoto portón', null, 'done', 'low', 'Portón vehicular eléctrico', false, date '2026-07-18', timestamptz '2026-07-20 10:00:00', null, null),
  ('Revisión eléctrica general', null, 'open', 'high', null, true, date '2026-08-05', null::timestamptz, null, null),
  ('Fumigación trimestral', null, 'open', 'medium', null, false, date '2026-08-30', null::timestamptz, 3, 'months'),
  ('Lavar cortinas y persianas', null, 'open', 'low', null, false, null::date, null::timestamptz, null, null)
) as t(title, description, status, priority, asset_name, assign, due_date, completed_at, recurrence_value, recurrence_unit);

-- Un par de notas de ejemplo en la tarea de la fuga de agua
insert into public.work_order_notes (work_order_id, author_id, body, notify_owner)
select
  (select id from public.work_orders where title = 'Fuga de agua en baño de visitas' limit 1),
  (select id from public.profiles where role = 'owner' order by created_at limit 1),
  'Ferretero viene el lunes a revisar la llave de paso.',
  false
where exists (select 1 from public.work_orders where title = 'Fuga de agua en baño de visitas');
