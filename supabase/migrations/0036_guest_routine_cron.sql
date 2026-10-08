-- Schedules the guest-routine reminder check every 15 minutes (fine enough
-- to catch items on the :00/:30 marks the owner actually uses, without
-- needing Vercel's own Cron Jobs feature — the Hobby plan only allows
-- once-a-day schedules there, which is why this goes through pg_cron +
-- pg_net instead, calling a plain API route rather than a registered
-- Vercel cron). The bearer secret is pulled from Supabase Vault at run
-- time (seeded live via `select vault.create_secret(...)`, name
-- 'routine_cron_secret' — never committed here) so this file never holds
-- the literal value.
select cron.schedule(
  'guest-routine-check',
  '*/15 * * * *',
  $$
  select net.http_get(
    url := 'https://coronado-vert.vercel.app/api/cron/routine',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'routine_cron_secret')
    )
  );
  $$
);
