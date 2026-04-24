-- Add recurrence columns to planned_events
ALTER TABLE public.planned_events
  ADD COLUMN IF NOT EXISTS recurrence_rule text CHECK (recurrence_rule IN ('weekly', 'monthly')),
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES public.planned_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence_cancelled_at timestamptz;

-- Index for efficient lookups of recurring children
CREATE INDEX IF NOT EXISTS idx_planned_events_recurrence_parent
  ON public.planned_events(recurrence_parent_id)
  WHERE recurrence_parent_id IS NOT NULL;
