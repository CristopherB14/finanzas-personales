-- Database function hardening (Supabase security advisors).

-- set_updated_at touches no tables, so an empty search_path is safe and prevents
-- search_path injection (function_search_path_mutable advisor).
ALTER FUNCTION public.set_updated_at() SET search_path = '';

-- Trigger functions are invoked by triggers, never directly. Remove the
-- implicit EXECUTE grant so they cannot be called via the PostgREST RPC endpoint
-- (anon/authenticated SECURITY DEFINER executable advisors).
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
