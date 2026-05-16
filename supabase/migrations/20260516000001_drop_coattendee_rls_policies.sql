-- Fix ALL circular RLS recursion that causes 500 on players table.
--
-- Cycles found:
--   1. players → planned_events → players  (via "View public event organizer profile" ↔ "Users can view accessible events")
--   2. planned_events → event_rsvp → planned_events  (RSVP policy queries planned_events, planned_events queries event_rsvp)
--   3. event_rsvp → players → planned_events → event_rsvp  (via "Users can manage their own RSVP" querying players)
--   4. players ↔ club_members  (via co-attendee policies)
--
-- Fix: break all cross-table references in RLS with SECURITY DEFINER helpers.

-- ── 1. Drop broken co-attendee policies ─────────────────────────────────────────
DROP POLICY IF EXISTS "Event co-attendees can view each other" ON public.players;
DROP POLICY IF EXISTS "Event co-attendees can view each others club memberships" ON public.club_members;

-- ── 2. SECURITY DEFINER helpers ─────────────────────────────────────────────────

-- get_my_player_ids() already exists from earlier migration — ensure it's present
CREATE OR REPLACE FUNCTION public.get_my_player_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$
  SELECT id FROM players WHERE user_id = auth.uid();
$$;

-- Returns event IDs visible to current user (bypasses planned_events + club_members RLS)
CREATE OR REPLACE FUNCTION public.get_accessible_event_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$
  SELECT pe.id FROM planned_events pe
  WHERE pe.created_by = auth.uid()
     OR pe.is_public = true
     OR pe.club_id IN (
       SELECT cm.club_id FROM club_members cm
       WHERE cm.user_id = auth.uid() AND cm.status = 'active'
     )
     OR pe.id IN (
       SELECT er.event_id FROM event_rsvp er
       WHERE er.player_id IN (SELECT id FROM players WHERE user_id = auth.uid())
         AND er.status = 'attending'
     );
$$;

-- Returns user_ids of public-event organizers (bypasses planned_events RLS)
CREATE OR REPLACE FUNCTION public.get_public_event_organizer_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$
  SELECT DISTINCT pe.created_by FROM planned_events pe WHERE pe.is_public = true;
$$;

-- ── 3. Fix "View public event organizer profile" on players ─────────────────────
-- Was: subquery on planned_events (triggers planned_events RLS → recursion)
-- Now: uses SECURITY DEFINER helper
DROP POLICY IF EXISTS "View public event organizer profile" ON public.players;
CREATE POLICY "View public event organizer profile"
  ON public.players FOR SELECT TO authenticated
  USING (user_id IN (SELECT public.get_public_event_organizer_ids()));

-- ── 4. Fix "Users can view accessible events" on planned_events ─────────────────
-- Was: JOIN players p (triggers players RLS → recursion)
-- Now: uses get_my_player_ids() to bypass players RLS
DROP POLICY IF EXISTS "Users can view accessible events" ON public.planned_events;
CREATE POLICY "Users can view accessible events"
  ON public.planned_events FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_public = true
    OR club_id IN (
      SELECT club_id FROM public.club_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
    OR id IN (
      SELECT er.event_id FROM public.event_rsvp er
      WHERE er.player_id IN (SELECT public.get_my_player_ids())
        AND er.status = 'attending'
    )
  );

-- ── 5. Fix "Users can view RSVPs for accessible events" on event_rsvp ───────────
-- Was: subquery on planned_events (triggers planned_events RLS → recursion)
-- Now: uses SECURITY DEFINER helper to bypass planned_events RLS
DROP POLICY IF EXISTS "Users can view RSVPs for accessible events" ON public.event_rsvp;
CREATE POLICY "Users can view RSVPs for accessible events"
  ON public.event_rsvp FOR SELECT
  USING (event_id IN (SELECT public.get_accessible_event_ids()));

-- ── 6. Fix "Users can manage their own RSVP" on event_rsvp ─────────────────────
-- Was: player_id IN (SELECT id FROM players WHERE user_id = auth.uid()) — triggers players RLS
-- Now: uses get_my_player_ids() to bypass players RLS
DROP POLICY IF EXISTS "Users can manage their own RSVP" ON public.event_rsvp;
CREATE POLICY "Users can manage their own RSVP"
  ON public.event_rsvp FOR ALL
  USING (player_id IN (SELECT public.get_my_player_ids()))
  WITH CHECK (player_id IN (SELECT public.get_my_player_ids()));
