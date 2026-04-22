-- Fix: detach player from auth user before deleting (avoids FK violation).
-- Player data (name, positions, game history) is preserved for past events.
-- Only auth access, profile image, and club memberships are removed.
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

  -- Clear image_url and detach user_id FK so the auth row can be deleted
  UPDATE public.players
  SET image_url = NULL,
      user_id   = NULL
  WHERE user_id = v_uid;

  -- Deactivate club memberships
  UPDATE public.club_members
  SET is_active = false
  WHERE user_id = v_uid;

  -- Remove the auth user (cascades session tokens, notifications, etc.)
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
