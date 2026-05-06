-- Fix: NULL out ALL foreign key references to auth.users before deleting,
-- so deletion is never blocked by FK constraints.
-- Affected columns: club_members.removed_by, clubs.created_by,
-- match_days.created_by, match_days.last_modified_by,
-- match_players.adjusted_by, matches.added_by_user_id, players.user_id.

-- clubs.created_by is NOT NULL — make it nullable so deleted users don't block
ALTER TABLE public.clubs ALTER COLUMN created_by DROP NOT NULL;

DROP FUNCTION IF EXISTS public.delete_own_account();

CREATE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING errcode = '42501';
  END IF;

  -- Clear image and detach player from auth user (preserves game history)
  UPDATE public.players
  SET image_url = NULL,
      user_id   = NULL
  WHERE user_id = v_uid;

  -- Deactivate club memberships
  UPDATE public.club_members
  SET is_active = false
  WHERE user_id = v_uid;

  -- NULL out all other FK references to this auth user
  UPDATE public.club_members
  SET removed_by = NULL
  WHERE removed_by = v_uid;

  UPDATE public.clubs
  SET created_by = NULL
  WHERE created_by = v_uid;

  UPDATE public.match_days
  SET created_by = NULL
  WHERE created_by = v_uid;

  UPDATE public.match_days
  SET last_modified_by = NULL
  WHERE last_modified_by = v_uid;

  UPDATE public.game_players
  SET adjusted_by = NULL
  WHERE adjusted_by = v_uid;

  UPDATE public.matches
  SET added_by_user_id = NULL
  WHERE added_by_user_id = v_uid;

  -- Remove the auth user (cascades session tokens, notifications, user_profiles)
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
