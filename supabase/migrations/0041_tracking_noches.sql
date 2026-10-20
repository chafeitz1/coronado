-- Noches del evento tal como las lleva el Google Sheet (a veces no es exactamente
-- salida − llegada, p. ej. un feriado que cuenta una noche menos). Nullable:
-- si no hay valor, la app usa salida − llegada.
alter table public.tracking_events add column if not exists noches integer;
