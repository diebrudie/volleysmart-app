-- Allow RSVP'd attendees to always see an event, even after it's switched to private.
-- This supports the "close registration" pattern: organizer makes event public to gather
-- players, then switches to private to stop new sign-ups while keeping existing attendees.

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
      JOIN public.players p ON p.id = er.player_id
      WHERE p.user_id = auth.uid()
        AND er.status = 'attending'
    )
  );
