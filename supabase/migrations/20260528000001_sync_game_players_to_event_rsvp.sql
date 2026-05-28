-- Sync game_players to event_rsvp so that players added during game editing
-- (and guests) appear as event attendees, not only those who RSVP'd beforehand.

-- ── Part 1: Add suppression check to the RSVP notification trigger ────────────
-- The sync trigger below inserts into event_rsvp, which would fire
-- trg_notify_event_rsvp and spam "X RSVPed as attending" for every game player.
-- We add a session-variable check so only real user RSVPs send notifications.

CREATE OR REPLACE FUNCTION public.trg_notify_event_rsvp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  v_event_club_id uuid;
  v_event_title text;
  v_player_name text;
  v_player_user_id uuid;
BEGIN
  IF current_setting('volleysmart.suppress_rsvp_notify', true) = 'true' THEN
    RETURN NEW;
  END IF;

  SELECT pe.club_id, pe.title INTO v_event_club_id, v_event_title
  FROM public.planned_events pe WHERE pe.id = NEW.event_id;

  SELECT p.user_id, coalesce(p.first_name || ' ' || substr(p.last_name, 1, 1) || '.', 'A player')
  INTO v_player_user_id, v_player_name
  FROM public.players p WHERE p.id = NEW.player_id;

  IF v_event_club_id IS NOT NULL THEN
    PERFORM notify_club_members(
      v_event_club_id, 'event_rsvp',
      jsonb_build_object(
        'club_id', v_event_club_id,
        'event_id', NEW.event_id,
        'event_title', v_event_title,
        'player_name', v_player_name,
        'rsvp_status', NEW.status::text
      ),
      v_player_user_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ── Part 2: Trigger to sync game_players → event_rsvp ────────────────────────

CREATE OR REPLACE FUNCTION public.sync_game_player_to_event_rsvp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  v_event_id uuid;
BEGIN
  SELECT md.planned_event_id INTO v_event_id
  FROM public.match_days md
  WHERE md.id = NEW.match_day_id;

  IF v_event_id IS NOT NULL AND NEW.player_id IS NOT NULL THEN
    PERFORM set_config('volleysmart.suppress_rsvp_notify', 'true', true);

    INSERT INTO public.event_rsvp (event_id, player_id, status, responded_at)
    VALUES (v_event_id, NEW.player_id, 'attending', now())
    ON CONFLICT (event_id, player_id) DO NOTHING;

    PERFORM set_config('volleysmart.suppress_rsvp_notify', '', true);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_game_player_to_event_rsvp ON public.game_players;
CREATE TRIGGER trg_sync_game_player_to_event_rsvp
  AFTER INSERT ON public.game_players
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_game_player_to_event_rsvp();

-- ── Part 3: Backfill historical gaps ──────────────────────────────────────────
-- Re-run the same pattern as migration 20260422000006 to catch any game_players
-- created since that migration that lack corresponding event_rsvp records.

INSERT INTO event_rsvp (event_id, player_id, status, responded_at)
SELECT DISTINCT
  md.planned_event_id,
  gp.player_id,
  'attending'::rsvp_status,
  coalesce(gp.created_at, md.created_at, now())
FROM game_players gp
JOIN match_days md ON md.id = gp.match_day_id
WHERE md.planned_event_id IS NOT NULL
  AND gp.player_id IS NOT NULL
ON CONFLICT (event_id, player_id) DO NOTHING;
