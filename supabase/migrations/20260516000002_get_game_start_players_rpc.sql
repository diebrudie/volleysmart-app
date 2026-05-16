-- RPC to fetch all attending players + their club memberships for game start.
-- Replaces the broken co-attendee RLS policies with a targeted SECURITY DEFINER function.

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
  -- Verify caller is attending this event
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
