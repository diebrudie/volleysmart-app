-- Phase 12: Prevent duplicate games per event
-- A planned_event can only be linked to one match_day
CREATE UNIQUE INDEX IF NOT EXISTS match_days_planned_event_id_unique
  ON match_days (planned_event_id) WHERE planned_event_id IS NOT NULL;
