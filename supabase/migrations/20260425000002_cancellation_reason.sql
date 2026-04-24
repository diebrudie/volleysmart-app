-- Add cancellation reason and comment fields to planned_events
ALTER TABLE public.planned_events
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_comment text;
