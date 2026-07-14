-- Complete delete_own_account(): handle the FK references to auth.users that
-- the previous version (20260505000001) missed. Without these, a user who had
-- created a planned_event, sent a chat message, or created a personal location
-- could NOT delete their own account — the final DELETE FROM auth.users was
-- blocked by a NO ACTION foreign key.
--
--   planned_events.created_by  NOT NULL, NO ACTION -> make nullable + set NULL
--   locations.created_by       nullable, NO ACTION -> set NULL
--   messages.sender_id         NOT NULL, NO ACTION -> delete the chat rows
--
-- Game/event history is still preserved: players rows are detached (not
-- deleted) and game_players.snapshot_name keeps the displayed name.

-- planned_events.created_by is NOT NULL; make it nullable so a deleted creator
-- doesn't block deletion (mirrors clubs.created_by in 20260505000001).
ALTER TABLE public.planned_events ALTER COLUMN created_by DROP NOT NULL;

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

  -- Newly handled FKs (were blocking deletion for event creators etc.)
  UPDATE public.planned_events
  SET created_by = NULL
  WHERE created_by = v_uid;

  UPDATE public.locations
  SET created_by = NULL
  WHERE created_by = v_uid;

  -- Chat messages have a NOT NULL sender FK and are not history — remove them.
  DELETE FROM public.messages
  WHERE sender_id = v_uid;

  -- Remove the auth user (cascades session tokens, notifications, user_profiles,
  -- club_members, event_templates, club_invitations, notification_preferences)
  DELETE FROM auth.users WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
