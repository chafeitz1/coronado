-- Sample data for the Directorio: vendors (proveedores) + family/staff people.
-- Safe to run once in the Supabase SQL Editor. Not idempotent — running it
-- twice will insert duplicates.

-- ---------------------------------------------------------------------------
-- Proveedores
-- ---------------------------------------------------------------------------
with owner as (
  select id from public.profiles where role = 'owner' order by created_at limit 1
)
insert into public.vendors (name, contact_name, trades, phone, email, created_by)
select t.name, t.contact_name, t.trades, t.phone, t.email, (select id from owner)
from (
  values
    ('MIVA Bombas y A/C', 'Julio', array['pool', 'hvac']::text[], '+507 6430-6611', 'julio@miva.com'),
    ('Electricista Pérez', null, array['electrical']::text[], '+507 6000-1234', null),
    ('Jardinería Verde', 'Ana', array['gardening']::text[], null, 'ana@verde.com'),
    ('Limpieza Total', 'Rosa', array['cleaning']::text[], '+507 6222-3333', null),
    ('Plomería Rápida', null, array['plumbing']::text[], '+507 6444-5555', 'contacto@plomeriarapida.com'),
    ('Fumigadora Panamá', null, array['pest_control']::text[], '+507 6666-7777', null),
    ('Carpintería Sol', 'Miguel', array['carpentry', 'painting']::text[], '+507 6888-9999', null),
    ('Seguridad Coronado', null, array['security']::text[], '+507 6111-2222', 'info@seguridadcoronado.com')
) as t(name, contact_name, trades, phone, email);

-- ---------------------------------------------------------------------------
-- Family y staff de muestra
--
-- Inserta directamente en auth.users (con email/clave falsos) para que el
-- trigger on_auth_user_created cree el registro en profiles automáticamente,
-- igual que con una invitación real. Clave de prueba para los 4: coronado2026
-- (por si quieres iniciar sesión como alguno de ellos para probar esa vista).
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  new_id uuid;
begin
  for r in
    select * from (
      values
        ('Sofía Hafeitz', 'sofia@casacoronado.test', 'family', '+507 6555-1111'),
        ('Diego Hafeitz', 'diego@casacoronado.test', 'family', '+507 6555-2222'),
        ('María López', 'maria@casacoronado.test', 'staff', '+507 6555-3333'),
        ('Andrés Rodríguez', 'andres@casacoronado.test', 'staff', '+507 6555-4444')
    ) as t(full_name, email, role, phone)
  loop
    new_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', new_id, 'authenticated', 'authenticated',
      r.email, crypt('coronado2026', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', r.full_name, 'role', r.role),
      now(), now(), '', '', '', '', '', '', '', ''
    );

    update public.profiles set phone = r.phone where id = new_id;
  end loop;
end $$;
