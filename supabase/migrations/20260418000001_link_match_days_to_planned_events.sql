-- Migration: link match_days to planned_events
--
-- 1. Adds planned_event_id FK column to match_days
-- 2. Creates a planned_events row for every existing match_day (legacy "games")
--    with computed metadata: title = "[Weekday] Training", event_type = 'friendly_game',
--    start_time = '19:00', is_public = false, status = 'completed'
-- 3. Links each match_day.planned_event_id back to the newly created row

-- Step 1: Add FK column
ALTER TABLE match_days
  ADD COLUMN IF NOT EXISTS planned_event_id uuid REFERENCES planned_events(id);

-- Step 2: Create planned_events for all unlinked match_days and link them
DO $$
DECLARE
  md_row    RECORD;
  creator_id uuid;
  new_event_id uuid;
BEGIN
  FOR md_row IN
    SELECT * FROM match_days
    WHERE planned_event_id IS NULL
    ORDER BY date ASC
  LOOP
    -- Find best creator: prefer admin, then editor, then any active member
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

    -- Skip this match_day if no club member can be found
    IF creator_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Create the corresponding planned_event
    INSERT INTO planned_events (
      club_id,
      created_by,
      title,
      event_type,
      date,
      start_time,
      is_public,
      status,
      min_players,
      location_id
    ) VALUES (
      md_row.club_id,
      creator_id,
      trim(to_char(md_row.date::date, 'Day')) || ' Training',
      'friendly_game',
      md_row.date,
      '19:00:00',
      false,
      'completed',
      4,
      md_row.location_id
    )
    RETURNING id INTO new_event_id;

    -- Link the match_day to its new planned_event
    UPDATE match_days
    SET planned_event_id = new_event_id
    WHERE id = md_row.id;

  END LOOP;
END $$;
