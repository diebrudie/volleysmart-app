-- Add opponent team mode columns to planned_events
ALTER TABLE planned_events
  ADD COLUMN IF NOT EXISTS is_opponent_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS opponent_team_name text;

-- Add opponent team mode columns to match_days (copied at game-start time)
ALTER TABLE match_days
  ADD COLUMN IF NOT EXISTS is_opponent_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS opponent_team_name text;
