-- Add end_time column to planned_events
ALTER TABLE public.planned_events
  ADD COLUMN end_time time;

-- Backfill existing rows: set end_time to start_time + 2 hours
UPDATE public.planned_events
  SET end_time = start_time + interval '2 hours';

-- Make it NOT NULL after backfill
ALTER TABLE public.planned_events
  ALTER COLUMN end_time SET NOT NULL;
