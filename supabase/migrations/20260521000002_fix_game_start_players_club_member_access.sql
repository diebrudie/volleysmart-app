-- Allow any club member (not just attending players) to start a game.
-- Also adds gender and ALL positions (as JSON) to the result set.
-- Must DROP first because return type changed.

DROP FUNCTION IF EXISTS public.get_game_start_players(uuid);

CREATE OR REPLACE FUNCTION public.get_game_start_players(p_event_id uuid)
RETURNS TABLE(
  player_id uuid,
  first_name text,
  skill_rating integer,
  user_id uuid,
  gender text,
  positions jsonb,
  club_memberships jsonb
) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_club_id uuid;
BEGIN
  SELECT pe.club_id INTO v_club_id
  FROM planned_events pe
  WHERE pe.id = p_event_id;

  IF NOT EXISTS (
    SELECT 1 FROM club_members cm
    WHERE cm.club_id = v_club_id
      AND cm.user_id = v_user_id
      AND cm.is_active = true
      AND cm.status = 'active'
  ) AND NOT EXISTS (
    SELECT 1 FROM event_rsvp er
    JOIN players pl ON pl.id = er.player_id
    WHERE er.event_id = p_event_id
      AND er.status = 'attending'
      AND pl.user_id = v_user_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id AS player_id,
    p.first_name::text AS first_name,
    p.skill_rating,
    p.user_id,
    p.gender::text AS gender,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
          'name', pos.name,
          'is_primary', pp.is_primary
       ) ORDER BY pp.is_primary DESC, pos.name)
       FROM player_positions pp
       JOIN positions pos ON pos.id = pp.position_id
       WHERE pp.player_id = p.id),
      '[]'::jsonb
    ) AS positions,
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
  WHERE er.event_id = p_event_id
    AND er.status = 'attending'
  GROUP BY p.id, p.first_name, p.skill_rating, p.user_id, p.gender
  ORDER BY p.id;
END;
$$;
