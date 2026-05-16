-- Originally added co-attendee RLS policies on players and club_members.
-- These caused infinite cross-table RLS recursion and were dropped in 20260516000001.
-- Replaced by get_game_start_players() RPC in 20260516000002.

-- Keep the SECURITY DEFINER helpers (used elsewhere)
CREATE OR REPLACE FUNCTION public.get_my_player_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$
  SELECT id FROM players WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_player_ids_for_user(p_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO public AS $$
  SELECT id FROM players WHERE user_id = p_user_id;
$$;
