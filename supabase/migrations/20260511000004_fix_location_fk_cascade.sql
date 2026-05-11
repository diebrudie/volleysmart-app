-- Fix: allow location deletion even when referenced by planned events.
-- The existing FK defaults to RESTRICT, causing 409 on delete.
-- Change to SET NULL so the event keeps existing but loses its location reference.
ALTER TABLE public.planned_events
  DROP CONSTRAINT IF EXISTS planned_events_location_id_fkey,
  ADD CONSTRAINT planned_events_location_id_fkey
    FOREIGN KEY (location_id) REFERENCES public.locations(id)
    ON DELETE SET NULL;
