-- Backfill planned_events for "orphan" games (match_days with no linked event).
--
-- "Create game with same teams" historically inserted a match_day WITHOUT a
-- planned_event_id, so those games had no entry point in the Events list and
-- became unreachable once the user navigated away. Going forward
-- createSameTeams() creates a parallel event; this migration repairs the games
-- that were already orphaned.
--
-- For each unlinked match_day we create a planned_event dated the same day and
-- link it back. Past games get status 'completed' (they only surface in the
-- Past Events list, which ignores status); today/future games get 'open' so
-- they appear in the Upcoming list (which filters to open/confirmed/cancelled).
-- Attendee RSVPs are then backfilled from the game roster.
--
-- Idempotent: only touches rows where planned_event_id IS NULL, and the RSVP
-- insert uses ON CONFLICT DO NOTHING.

DO $$
DECLARE
  md_row       RECORD;
  creator_id   uuid;
  new_event_id uuid;
BEGIN
  FOR md_row IN
    SELECT * FROM match_days
    WHERE planned_event_id IS NULL
    ORDER BY date ASC
  LOOP
    -- Prefer a club admin/editor as the event creator; fall back to the
    -- match_day's own creator (covers clubless / personal games).
    creator_id := NULL;
    IF md_row.club_id IS NOT NULL THEN
      SELECT cm.user_id INTO creator_id
      FROM club_members cm
      WHERE cm.club_id = md_row.club_id
        AND cm.is_active = true
      ORDER BY
        CASE cm.role
          WHEN 'admin'  THEN 0
          WHEN 'editor' THEN 1
          ELSE 2
        END,
        cm.joined_at ASC
      LIMIT 1;
    END IF;

    IF creator_id IS NULL THEN
      creator_id := md_row.created_by;
    END IF;

    -- Nothing sensible to attribute the event to: skip.
    IF creator_id IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO planned_events (
      club_id,
      created_by,
      title,
      event_type,
      date,
      start_time,
      end_time,
      is_public,
      status,
      min_players,
      event_gender,
      activity_type,
      is_opponent_mode,
      opponent_team_name,
      location_id
    ) VALUES (
      md_row.club_id,
      creator_id,
      trim(to_char(md_row.date::date, 'Day')) || ' Game',
      'friendly_game',
      md_row.date,
      '19:00:00',
      '21:00:00',
      false,
      CASE WHEN md_row.date::date < CURRENT_DATE THEN 'completed'::event_status
           ELSE 'open'::event_status END,
      4,
      'mixed',
      'indoor',
      COALESCE(md_row.is_opponent_mode, false),
      md_row.opponent_team_name,
      md_row.location_id
    )
    RETURNING id INTO new_event_id;

    UPDATE match_days
    SET planned_event_id = new_event_id
    WHERE id = md_row.id;
  END LOOP;
END $$;

-- Backfill attendee RSVPs for every player on a newly-linked game so the
-- event's attendee list matches the roster.
INSERT INTO event_rsvp (event_id, player_id, status, responded_at)
SELECT DISTINCT
  md.planned_event_id,
  gp.player_id,
  'attending'::rsvp_status,
  md.created_at
FROM game_players gp
JOIN match_days md ON md.id = gp.match_day_id
WHERE md.planned_event_id IS NOT NULL
  AND gp.player_id IS NOT NULL
ON CONFLICT (event_id, player_id) DO NOTHING;
