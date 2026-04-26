-- Add created_by to locations so personal locations are only visible to their creator
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Backfill: set created_by for clubless locations to the first club admin of any club that used them,
-- or leave NULL (they'll be visible to nobody until claimed — acceptable for old data)

-- Update RLS: personal locations (club_id IS NULL) only visible to creator
DROP POLICY IF EXISTS "Users can view accessible locations" ON public.locations;
CREATE POLICY "Users can view accessible locations"
  ON public.locations FOR SELECT
  USING (
    -- Club locations: visible to club members
    (club_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = locations.club_id
        AND club_members.user_id = auth.uid()
    ))
    OR
    -- Personal locations: only visible to creator
    (club_id IS NULL AND created_by = auth.uid())
  );

-- Update INSERT policy to set created_by
DROP POLICY IF EXISTS "Authenticated users can create locations" ON public.locations;
CREATE POLICY "Authenticated users can create locations"
  ON public.locations FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      club_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.club_members
        WHERE club_members.club_id = locations.club_id
          AND club_members.user_id = auth.uid()
      )
    )
  );

-- Allow users to update locations they created or that belong to their club
DROP POLICY IF EXISTS "Users can update their locations" ON public.locations;
CREATE POLICY "Users can update their locations"
  ON public.locations FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = locations.club_id
        AND club_members.user_id = auth.uid()
    )
  );
