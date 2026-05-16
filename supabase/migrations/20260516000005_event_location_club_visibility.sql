-- Make event locations and host club names visible to all event viewers.
-- Currently locations and clubs RLS only allows club members to see records,
-- so cross-club attendees and public event viewers see NULL for address/club name.

-- ── SECURITY DEFINER helpers (bypass RLS on all referenced tables) ───────────────

-- Returns location IDs from events the user can access
CREATE OR REPLACE FUNCTION public.get_event_location_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$
  SELECT DISTINCT pe.location_id FROM planned_events pe
  WHERE pe.location_id IS NOT NULL
    AND (
      pe.is_public = true
      OR pe.created_by = auth.uid()
      OR pe.club_id IN (
        SELECT cm.club_id FROM club_members cm
        WHERE cm.user_id = auth.uid() AND cm.status = 'active'
      )
      OR pe.id IN (
        SELECT er.event_id FROM event_rsvp er
        WHERE er.player_id IN (SELECT id FROM players WHERE user_id = auth.uid())
          AND er.status = 'attending'
      )
    );
$$;

-- Returns club IDs that host events the user can access
CREATE OR REPLACE FUNCTION public.get_event_host_club_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$
  SELECT DISTINCT pe.club_id FROM planned_events pe
  WHERE pe.club_id IS NOT NULL
    AND (
      pe.is_public = true
      OR pe.created_by = auth.uid()
      OR pe.id IN (
        SELECT er.event_id FROM event_rsvp er
        WHERE er.player_id IN (SELECT id FROM players WHERE user_id = auth.uid())
          AND er.status = 'attending'
      )
    );
$$;

-- ── New SELECT policies ─────────────────────────────────────────────────────────

-- Locations: visible when referenced by an accessible event
CREATE POLICY "Event attendees can view event locations"
  ON public.locations FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_event_location_ids()));

-- Clubs: visible when hosting an accessible event
CREATE POLICY "Event attendees can view host clubs"
  ON public.clubs FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_event_host_club_ids()));
