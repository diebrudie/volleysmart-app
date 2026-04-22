-- RPC to let a user delete their own auth account.
-- Player data (first_name, last_name, positions, game history) is preserved
-- so past events/games remain intact. Only auth access + profile image are removed.
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_image text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING errcode = '42501';
  END IF;

  -- Clear image_url on the player record (keep everything else for history)
  UPDATE public.players
  SET image_url = NULL
  WHERE user_id = v_uid;

  -- Remove the auth user (cascades session tokens etc.)
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
