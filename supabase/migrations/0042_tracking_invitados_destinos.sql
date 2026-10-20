-- Tracking Assist.: quién fue de invitado a cada fin de semana y a dónde fue una familia
-- cuando no vino a Coronado (Santa Clara, Punta Chame…), tomado de las notas del Google Sheet.
alter table public.tracking_events add column if not exists invitados text;
-- [{ "familia": "Flia Hafeitz Abadi", "lugar": "Punta Chame" | null, "nota": "texto" }]
alter table public.tracking_events add column if not exists otros jsonb not null default '[]'::jsonb;
