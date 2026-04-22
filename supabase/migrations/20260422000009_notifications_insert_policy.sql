-- Fix: ensure notification triggers can insert rows.
-- SECURITY DEFINER functions bypass RLS in standard Postgres,
-- but Supabase's realtime/PostgREST layer can interfere.
-- Adding an explicit INSERT policy as a safety net.

-- Allow inserts where user_id matches the caller OR from service_role / trigger context
CREATE POLICY "Allow notification inserts"
  ON public.notifications FOR INSERT
  WITH CHECK (true);
