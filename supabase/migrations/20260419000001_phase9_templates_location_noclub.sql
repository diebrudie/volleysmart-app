-- Phase 9: Event templates, location improvements, no-club events
-- ============================================================================

-- ── 1. EVENT TEMPLATES TABLE ────────────────────────────────────────────────

CREATE TABLE public.event_templates (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  club_id     uuid        REFERENCES public.clubs(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  config      jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_event_templates_set_updated_at
  BEFORE UPDATE ON public.event_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;

-- Users can see their own templates + templates for clubs they belong to
CREATE POLICY "Users can view own and club templates"
  ON public.event_templates FOR SELECT
  USING (
    user_id = auth.uid()
    OR club_id IN (
      SELECT club_id FROM public.club_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can create templates"
  ON public.event_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own templates"
  ON public.event_templates FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own templates"
  ON public.event_templates FOR DELETE
  USING (user_id = auth.uid());

-- ── 2. EXTEND LOCATIONS TABLE ───────────────────────────────────────────────

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- ── 3. UPDATE LOCATIONS RLS ─────────────────────────────────────────────────
-- Allow clubless locations (for personal/no-club events)

DROP POLICY IF EXISTS "Users can create locations for their clubs" ON public.locations;
CREATE POLICY "Authenticated users can create locations"
  ON public.locations FOR INSERT
  WITH CHECK (
    club_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = locations.club_id
        AND club_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view locations from their clubs" ON public.locations;
CREATE POLICY "Users can view accessible locations"
  ON public.locations FOR SELECT
  USING (
    club_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = locations.club_id
        AND club_members.user_id = auth.uid()
    )
  );

-- ── 4. UPDATE PLANNED_EVENTS SELECT RLS ─────────────────────────────────────
-- Add created_by path so creators always see their own events (incl. private clubless)

DROP POLICY IF EXISTS "Club members can view their club's events" ON public.planned_events;
CREATE POLICY "Users can view accessible events"
  ON public.planned_events FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_public = true
    OR club_id IN (
      SELECT club_id FROM public.club_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ── 5. UPDATE EVENT_RSVP SELECT RLS ─────────────────────────────────────────
-- Add path for clubless events so RSVPs are visible

DROP POLICY IF EXISTS "Club members can view RSVPs for their events" ON public.event_rsvp;
CREATE POLICY "Users can view RSVPs for accessible events"
  ON public.event_rsvp FOR SELECT
  USING (
    event_id IN (
      SELECT pe.id FROM public.planned_events pe
      WHERE pe.created_by = auth.uid()
         OR pe.is_public = true
         OR pe.club_id IN (
           SELECT club_id FROM public.club_members
           WHERE user_id = auth.uid() AND status = 'active'
         )
    )
  );
