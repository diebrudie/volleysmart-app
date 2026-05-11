-- Allow club admins to delete locations belonging to their club
CREATE POLICY "Club admins can delete club locations"
  ON public.locations FOR DELETE
  USING (
    club_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.club_members
      WHERE club_members.club_id = locations.club_id
        AND club_members.user_id = auth.uid()
        AND club_members.role = 'admin'
        AND club_members.is_active = true
        AND club_members.status = 'active'
    )
  );
