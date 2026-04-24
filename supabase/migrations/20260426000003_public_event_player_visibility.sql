-- Allow viewing player profiles of attendees on public events.
-- Without this, non-members who RSVP to a public event can't see other attendees
-- or the event organizer's profile.
CREATE POLICY "View public event participant profiles"
  ON public.players FOR SELECT TO authenticated
  USING (
    -- Player is an attendee of a public event
    id IN (
      SELECT er.player_id FROM event_rsvp er
      JOIN planned_events pe ON pe.id = er.event_id
      WHERE pe.is_public = true
    )
    OR
    -- Player is the creator of a public event
    user_id IN (
      SELECT pe.created_by FROM planned_events pe
      WHERE pe.is_public = true
    )
  );

-- Also allow viewing player_positions for these players (needed for attendee display)
-- Check if a policy already allows this; if not, add one.
-- player_positions typically inherits from players access, but let's be safe.
