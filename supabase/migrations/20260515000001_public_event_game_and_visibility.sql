-- Issue 4: Allow public event attendees to start games (INSERT match_days, game_players)
-- Issue 1: Expand get_event_attendees to show names to attending players and shared-club members

-- match_days: INSERT for public event attendees
CREATE POLICY "Public event attendees can create match days"
  ON public.match_days FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND planned_event_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM planned_events pe
      JOIN event_rsvp er ON er.event_id = pe.id
      JOIN players p ON p.id = er.player_id
      WHERE pe.id = match_days.planned_event_id
        AND er.status = 'attending'
        AND p.user_id = auth.uid()
    )
  );

-- match_days: SELECT for public event attendees
CREATE POLICY "Public event attendees can view match days"
  ON public.match_days FOR SELECT TO authenticated
  USING (
    planned_event_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM planned_events pe
      JOIN event_rsvp er ON er.event_id = pe.id
      JOIN players p ON p.id = er.player_id
      WHERE pe.id = match_days.planned_event_id
        AND er.status = 'attending'
        AND p.user_id = auth.uid()
    )
  );

-- match_days: UPDATE for public event attendees
CREATE POLICY "Public event attendees can update match days"
  ON public.match_days FOR UPDATE TO authenticated
  USING (
    planned_event_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM planned_events pe
      JOIN event_rsvp er ON er.event_id = pe.id
      JOIN players p ON p.id = er.player_id
      WHERE pe.id = match_days.planned_event_id
        AND er.status = 'attending'
        AND p.user_id = auth.uid()
    )
  );

-- matches: SELECT for public event attendees
CREATE POLICY "Public event attendees can view matches"
  ON public.matches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM match_days md
      JOIN planned_events pe ON pe.id = md.planned_event_id
      JOIN event_rsvp er ON er.event_id = pe.id
      JOIN players p ON p.id = er.player_id
      WHERE md.id = matches.match_day_id
        AND er.status = 'attending'
        AND p.user_id = auth.uid()
    )
  );

-- matches: UPDATE for public event attendees (needed for LiveScore)
CREATE POLICY "Public event attendees can update matches"
  ON public.matches FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM match_days md
      JOIN planned_events pe ON pe.id = md.planned_event_id
      JOIN event_rsvp er ON er.event_id = pe.id
      JOIN players p ON p.id = er.player_id
      WHERE md.id = matches.match_day_id
        AND er.status = 'attending'
        AND p.user_id = auth.uid()
    )
  );

-- game_players: INSERT for public event attendees
CREATE POLICY "Public event attendees can insert game_players"
  ON public.game_players FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM match_days md
      JOIN planned_events pe ON pe.id = md.planned_event_id
      JOIN event_rsvp er ON er.event_id = pe.id
      JOIN players p ON p.id = er.player_id
      WHERE md.id = game_players.match_day_id
        AND er.status = 'attending'
        AND p.user_id = auth.uid()
    )
  );

-- game_players: SELECT for public event attendees
CREATE POLICY "Public event attendees can view game_players"
  ON public.game_players FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM match_days md
      JOIN planned_events pe ON pe.id = md.planned_event_id
      JOIN event_rsvp er ON er.event_id = pe.id
      JOIN players p ON p.id = er.player_id
      WHERE md.id = game_players.match_day_id
        AND er.status = 'attending'
        AND p.user_id = auth.uid()
    )
  );

-- game_players: UPDATE for public event attendees
CREATE POLICY "Public event attendees can update game_players"
  ON public.game_players FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM match_days md
      JOIN planned_events pe ON pe.id = md.planned_event_id
      JOIN event_rsvp er ON er.event_id = pe.id
      JOIN players p ON p.id = er.player_id
      WHERE md.id = game_players.match_day_id
        AND er.status = 'attending'
        AND p.user_id = auth.uid()
    )
  );

-- Issue 1: Expand get_event_attendees to show names to attending players and shared-club members
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
  SELECT pe.created_by, pe.club_id INTO v_event
  FROM planned_events pe WHERE pe.id = p_event_id;

  IF v_event IS NULL THEN
    RETURN;
  END IF;

  -- Allow if: event creator, host club member, attending RSVP, or shares any club with creator
  IF v_event.created_by != v_user_id THEN
    IF NOT (
      -- Host club member
      (v_event.club_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM club_members cm
        WHERE cm.club_id = v_event.club_id
          AND cm.user_id = v_user_id
          AND cm.is_active = true
          AND cm.status = 'active'
      ))
      OR
      -- Attending RSVP for this event
      EXISTS (
        SELECT 1 FROM event_rsvp er
        JOIN players p ON p.id = er.player_id
        WHERE er.event_id = p_event_id
          AND er.status = 'attending'
          AND p.user_id = v_user_id
      )
      OR
      -- Shares any active club with the event creator
      EXISTS (
        SELECT 1 FROM club_members cm1
        JOIN club_members cm2 ON cm1.club_id = cm2.club_id
        WHERE cm1.user_id = v_user_id
          AND cm2.user_id = v_event.created_by
          AND cm1.is_active = true AND cm1.status = 'active'
          AND cm2.is_active = true AND cm2.status = 'active'
      )
    ) THEN
      RETURN;
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
