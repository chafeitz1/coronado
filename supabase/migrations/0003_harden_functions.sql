-- Fixes flagged by Supabase's security advisor (get_advisors):
-- 1. Pin search_path on set_updated_at (a mutable search_path on a
--    SECURITY DEFINER-adjacent trigger function is a hijacking vector).
-- 2. handle_new_user() is only ever invoked by the auth.users trigger —
--    revoking public EXECUTE closes the /rest/v1/rpc/handle_new_user
--    endpoint without affecting the trigger, which doesn't need it.
-- current_role()/is_owner() are intentionally left untouched: RLS policies
-- call them while running as `authenticated`, so revoking that grant would
-- break every policy that uses them.

alter function public.set_updated_at() set search_path = public;

revoke execute on function public.handle_new_user() from anon, authenticated;
