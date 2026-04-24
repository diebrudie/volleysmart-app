-- FEAT-06: Update RLS policies for public event visibility
-- Allow non-members to view RSVPs and event_clubs for public events,
-- enabling RSVP by any authenticated user on public events.

-- ── event_rsvp SELECT policy ──────────────────────────────────────────────────
-- OLD: Only club members can view RSVPs
-- NEW: Club members + anyone for public events
DROP POLICY IF EXISTS "Club members can view RSVPs for their events" ON public.event_rsvp;

CREATE POLICY "Users can view RSVPs for accessible events"
  ON public.event_rsvp FOR SELECT
  USING (
    -- Public events: anyone can see RSVPs
    event_id IN (
      SELECT pe.id FROM public.planned_events pe
      WHERE pe.is_public = true
    )
    -- Club members: can see RSVPs for their club's events
    OR event_id IN (
      SELECT pe.id FROM public.planned_events pe
      JOIN public.club_members cm ON cm.club_id = pe.club_id
      WHERE cm.user_id = auth.uid() AND cm.status = 'active'
    )
  );

-- ── event_clubs SELECT policy ─────────────────────────────────────────────────
-- OLD: Only club members can view event_clubs
-- NEW: Club members + anyone for public events
DROP POLICY IF EXISTS "Club members can view event_clubs" ON public.event_clubs;

CREATE POLICY "Users can view event_clubs for accessible events"
  ON public.event_clubs FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM public.planned_events WHERE is_public = true
    )
    OR club_id IN (
      SELECT club_id FROM public.club_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ── ROLLBACK SQL (for reference) ──────────────────────────────────────────────
-- To restore original policies, run:
--
-- DROP POLICY "Users can view RSVPs for accessible events" ON public.event_rsvp;
-- CREATE POLICY "Club members can view RSVPs for their events"
--   ON public.event_rsvp FOR SELECT
--   USING (
--     event_id IN (
--       SELECT pe.id FROM public.planned_events pe
--       JOIN public.club_members cm ON cm.club_id = pe.club_id
--       WHERE cm.user_id = auth.uid() AND cm.status = 'active'
--     )
--   );
--
-- DROP POLICY "Users can view event_clubs for accessible events" ON public.event_clubs;
-- CREATE POLICY "Club members can view event_clubs"
--   ON public.event_clubs FOR SELECT
--   USING (
--     club_id IN (
--       SELECT club_id FROM public.club_members
--       WHERE user_id = auth.uid() AND status = 'active'
--     )
--   );
