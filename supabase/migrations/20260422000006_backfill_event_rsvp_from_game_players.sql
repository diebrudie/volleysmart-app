-- Backfill event_rsvp for legacy games.
-- Every player in game_players gets an 'attending' RSVP on the linked planned_event.
-- Safe to re-run: ON CONFLICT skips existing rows.

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
