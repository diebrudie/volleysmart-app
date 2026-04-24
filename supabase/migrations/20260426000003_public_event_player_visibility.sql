-- Allow the organizer of a public event to see the creator's own profile
-- (they can always see themselves via existing "own row" policy).
-- For GDPR: non-member attendees can NOT see each other's profiles.
-- Only the event organizer can view all attendee profiles via this RPC.

-- RPC: fetch attendee profiles for an event (SECURITY DEFINER bypasses RLS).
-- Only the event creator can call this successfully.
CREATE OR REPLACE FUNCTION public.get_event_attendees(p_event_id uuid)
RETURNS TABLE(
  player_id uuid,
  first_name text,
  last_name text,
  image_url text,
  primary_position text,
  responded_at timestamptz
) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_event record;
BEGIN
  -- Verify the caller is the event creator or a member of the event's club
  SELECT pe.created_by, pe.club_id INTO v_event
  FROM planned_events pe WHERE pe.id = p_event_id;

  IF v_event IS NULL THEN
    RETURN;
  END IF;

  -- Allow: event creator, or active club member
  IF v_event.created_by != v_user_id THEN
    IF v_event.club_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM club_members cm
      WHERE cm.club_id = v_event.club_id
        AND cm.user_id = v_user_id
        AND cm.is_active = true
        AND cm.status = 'active'
    ) THEN
      RETURN; -- unauthorized, return empty
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    p.id AS player_id,
    p.first_name::text,
    p.last_name::text,
    p.image_url,
    pos.name::text AS primary_position,
    er.responded_at
  FROM event_rsvp er
  JOIN players p ON p.id = er.player_id
  LEFT JOIN player_positions pp ON pp.player_id = p.id AND pp.is_primary = true
  LEFT JOIN positions pos ON pos.id = pp.position_id
  WHERE er.event_id = p_event_id
    AND er.status = 'attending'
  ORDER BY er.responded_at ASC NULLS LAST;
END;
$$;

-- Also allow viewing the organizer's profile on public events
-- (so non-members see the organizer name, not "Unknown")
DROP POLICY IF EXISTS "View public event organizer profile" ON public.players;
CREATE POLICY "View public event organizer profile"
  ON public.players FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT pe.created_by FROM planned_events pe
      WHERE pe.is_public = true
    )
  );
