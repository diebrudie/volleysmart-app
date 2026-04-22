-- Allow users with a pending membership to see the club (needed for "Pending" cards in Clubs tab)
CREATE POLICY "pending_members_can_view_club"
  ON "public"."clubs"
  FOR SELECT
  TO "authenticated"
  USING (
    "status" = 'active'::"public"."club_status"
    AND EXISTS (
      SELECT 1
      FROM "public"."club_members" cm
      WHERE cm.club_id = clubs.id
        AND cm.user_id = auth.uid()
        AND cm.status = 'pending'::"public"."membership_status"
    )
  );
