-- Drop the insecure public policy that allows anyone to view matches
DROP POLICY IF EXISTS "Anyone can view matches" ON public.matches;

-- Create secure policy that restricts SELECT access to authenticated club members
CREATE POLICY "Club members can view matches"
ON public.matches
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM match_days md
    JOIN club_members cm ON md.club_id = cm.club_id
    WHERE md.id = matches.match_day_id
      AND cm.user_id = auth.uid()
      AND cm.is_active = true
  )
);