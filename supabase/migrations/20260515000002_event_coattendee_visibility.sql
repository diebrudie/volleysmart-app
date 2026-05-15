-- Fix: event co-attendees can see each other's player profiles and club memberships.
-- Without this, handleStartGame only sees players from the organizer's own clubs (RLS filters the rest).
-- Uses SECURITY DEFINER helpers to avoid infinite RLS recursion between players ↔ club_members.

-- Helper: get current user's player IDs (bypasses players RLS)
CREATE OR REPLACE FUNCTION public.get_my_player_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$
  SELECT id FROM players WHERE user_id = auth.uid();
$$;

-- Helper: get player IDs for any user (bypasses players RLS, used in club_members policy)
CREATE OR REPLACE FUNCTION public.get_player_ids_for_user(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$
  SELECT id FROM players WHERE user_id = p_user_id;
$$;

-- Players: allow viewing any player who is attending the same event as you
CREATE POLICY "Event co-attendees can view each other"
  ON public.players FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM event_rsvp er_self
      JOIN event_rsvp er_other ON er_other.event_id = er_self.event_id
      WHERE er_self.player_id IN (SELECT get_my_player_ids())
        AND er_other.player_id = players.id
        AND er_self.status = 'attending'
        AND er_other.status = 'attending'
    )
  );

-- Club members: allow viewing club memberships of co-attendees.
-- Uses get_player_ids_for_user() to avoid cross-table RLS recursion (players ↔ club_members).
CREATE POLICY "Event co-attendees can view each others club memberships"
  ON public.club_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM event_rsvp er_self
      JOIN event_rsvp er_other ON er_other.event_id = er_self.event_id
      WHERE er_self.player_id IN (SELECT get_my_player_ids())
        AND er_other.player_id IN (SELECT get_player_ids_for_user(club_members.user_id))
        AND er_self.status = 'attending'
        AND er_other.status = 'attending'
    )
  );
