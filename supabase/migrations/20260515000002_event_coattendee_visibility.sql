-- Fix: event co-attendees can see each other's player profiles and club memberships.
-- Without this, handleStartGame only sees players from the organizer's own clubs (RLS filters the rest).

-- Players: allow viewing any player who is attending the same event as you
CREATE POLICY "Event co-attendees can view each other"
  ON public.players FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM event_rsvp er_self
      JOIN players p_self ON p_self.id = er_self.player_id
      JOIN event_rsvp er_other ON er_other.event_id = er_self.event_id
      WHERE p_self.user_id = auth.uid()
        AND er_other.player_id = players.id
        AND er_self.status = 'attending'
        AND er_other.status = 'attending'
    )
  );

-- Club members: allow viewing club memberships of players attending the same event as you.
-- Needed for club vs club detection (queries club_members by user_id of co-attendees).
CREATE POLICY "Event co-attendees can view each others club memberships"
  ON public.club_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM event_rsvp er_self
      JOIN players p_self ON p_self.id = er_self.player_id
      JOIN event_rsvp er_other ON er_other.event_id = er_self.event_id
      JOIN players p_other ON p_other.id = er_other.player_id
      WHERE p_self.user_id = auth.uid()
        AND p_other.user_id = club_members.user_id
        AND er_self.status = 'attending'
        AND er_other.status = 'attending'
    )
  );
