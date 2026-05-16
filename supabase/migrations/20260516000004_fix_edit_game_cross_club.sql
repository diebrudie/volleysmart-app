-- Fix EditGame for cross-club/public event games:
-- 1. mark_match_day_modified: allow public event attendees (not just club members)
-- 2. game_players DELETE: add missing policy for public event attendees

-- ── 1. Update mark_match_day_modified ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.mark_match_day_modified(p_match_day_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  v_club_id uuid;
  v_event_id uuid;
BEGIN
  SELECT club_id, planned_event_id INTO v_club_id, v_event_id
  FROM match_days WHERE id = p_match_day_id;

  IF v_club_id IS NULL AND v_event_id IS NULL THEN
    RAISE EXCEPTION 'match_day not found' USING errcode = 'NO_DATA_FOUND';
  END IF;

  IF NOT (
    (v_club_id IS NOT NULL AND is_club_member(v_club_id, auth.uid()))
    OR
    (v_event_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM event_rsvp er
      WHERE er.event_id = v_event_id
        AND er.player_id IN (SELECT get_my_player_ids())
        AND er.status = 'attending'
    ))
  ) THEN
    RAISE EXCEPTION 'not allowed' USING errcode = '42501';
  END IF;

  UPDATE match_days
  SET last_modified_by = auth.uid(), last_modified_at = now()
  WHERE id = p_match_day_id;
END;
$$;

-- ── 2. Missing DELETE policy for public event attendees on game_players ──────────
CREATE POLICY "Public event attendees can delete game_players"
  ON public.game_players FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM match_days md
      JOIN planned_events pe ON pe.id = md.planned_event_id
      JOIN event_rsvp er ON er.event_id = pe.id
      WHERE md.id = game_players.match_day_id
        AND er.status = 'attending'
        AND er.player_id IN (SELECT public.get_my_player_ids())
    )
  );
