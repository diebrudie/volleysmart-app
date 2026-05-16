-- Fix 1: get_game_start_players returns duplicate rows when player has multiple
--         secondary positions. DISTINCT ON prevents duplicate game_players inserts.
-- Fix 2: get_event_attendees privacy model:
--         - Club members / event creator: always see names
--         - Non-club attending players: see names only after game starts (match_day exists)

-- ── Fix 1: get_game_start_players ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_game_start_players(p_event_id uuid)
RETURNS TABLE(
  player_id uuid,
  skill_rating integer,
  user_id uuid,
  primary_position text,
  secondary_position text,
  club_memberships jsonb
) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM event_rsvp er
    JOIN players p ON p.id = er.player_id
    WHERE er.event_id = p_event_id
      AND er.status = 'attending'
      AND p.user_id = v_user_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (p.id)
    p.id AS player_id,
    p.skill_rating,
    p.user_id,
    pos_pri.name::text AS primary_position,
    pos_sec.name::text AS secondary_position,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('club_id', cm.club_id, 'club_name', c.name))
       FROM club_members cm
       JOIN clubs c ON c.id = cm.club_id
       WHERE cm.user_id = p.user_id
         AND cm.is_active = true
         AND cm.status = 'active'),
      '[]'::jsonb
    ) AS club_memberships
  FROM event_rsvp er
  JOIN players p ON p.id = er.player_id
  LEFT JOIN player_positions pp_pri ON pp_pri.player_id = p.id AND pp_pri.is_primary = true
  LEFT JOIN positions pos_pri ON pos_pri.id = pp_pri.position_id
  LEFT JOIN player_positions pp_sec ON pp_sec.player_id = p.id AND pp_sec.is_primary = false
  LEFT JOIN positions pos_sec ON pos_sec.id = pp_sec.position_id
  WHERE er.event_id = p_event_id
    AND er.status = 'attending'
  ORDER BY p.id;
END;
$$;

-- ── Fix 2: get_event_attendees with privacy gating ──────────────────────────────
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
  v_game_started boolean;
BEGIN
  SELECT pe.created_by, pe.club_id INTO v_event
  FROM planned_events pe WHERE pe.id = p_event_id;

  IF v_event IS NULL THEN
    RETURN;
  END IF;

  v_game_started := EXISTS (
    SELECT 1 FROM match_days md WHERE md.planned_event_id = p_event_id
  );

  -- Allow if: event creator, host club member, shares club with creator,
  -- OR (attending RSVP AND game has started)
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
      -- Shares any active club with the event creator
      EXISTS (
        SELECT 1 FROM club_members cm1
        JOIN club_members cm2 ON cm1.club_id = cm2.club_id
        WHERE cm1.user_id = v_user_id
          AND cm2.user_id = v_event.created_by
          AND cm1.is_active = true AND cm1.status = 'active'
          AND cm2.is_active = true AND cm2.status = 'active'
      )
      OR
      -- Attending RSVP, but only after game starts
      (v_game_started AND EXISTS (
        SELECT 1 FROM event_rsvp er
        JOIN players p ON p.id = er.player_id
        WHERE er.event_id = p_event_id
          AND er.status = 'attending'
          AND p.user_id = v_user_id
      ))
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
