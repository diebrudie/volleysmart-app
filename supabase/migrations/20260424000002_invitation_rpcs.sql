-- ─── Invitation RPCs ────────────────────────────────────────────────────────
-- Four SECURITY DEFINER functions for the token-based invite system.

-- ─── 1. validate_invitation_token ───────────────────────────────────────────
-- Callable by anyone (anon + authenticated).
-- Returns club name/image if valid. For authenticated users, also returns
-- their membership status. NEVER returns club_id.
CREATE OR REPLACE FUNCTION public.validate_invitation_token(p_token text)
RETURNS TABLE(valid boolean, club_name text, club_image text, user_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_club_id uuid;
  v_club_name text;
  v_club_image text;
  v_revoked_at timestamptz;
  v_expires_at timestamptz;
  v_created_by uuid;
  v_uid uuid;
  v_member_status text;
BEGIN
  -- Look up the invitation
  SELECT ci.club_id, ci.revoked_at, ci.expires_at, ci.created_by
  INTO v_club_id, v_revoked_at, v_expires_at, v_created_by
  FROM public.club_invitations ci
  WHERE ci.token = p_token;

  -- Token not found
  IF v_club_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- Revoked
  IF v_revoked_at IS NOT NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- Expired
  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- Inviter must still be an active member
  IF NOT EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = v_club_id
      AND cm.user_id = v_created_by
      AND cm.status = 'active'
      AND cm.is_active = true
  ) THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- Club must still be active
  SELECT c.name, c.image_url
  INTO v_club_name, v_club_image
  FROM public.clubs c
  WHERE c.id = v_club_id AND c.status = 'active';

  IF v_club_name IS NULL THEN
    RETURN QUERY SELECT false, NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  -- Valid token — check authenticated user's membership status
  v_uid := auth.uid();
  v_member_status := NULL;

  IF v_uid IS NOT NULL THEN
    SELECT cm.status INTO v_member_status
    FROM public.club_members cm
    WHERE cm.club_id = v_club_id AND cm.user_id = v_uid
      AND cm.status IN ('active', 'pending');

    IF v_member_status = 'active' THEN
      v_member_status := 'already_member';
    ELSIF v_member_status = 'pending' THEN
      v_member_status := 'already_pending';
    ELSE
      v_member_status := 'not_member';
    END IF;
  END IF;

  RETURN QUERY SELECT true, v_club_name, v_club_image, v_member_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_invitation_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invitation_token(text) TO authenticated;


-- ─── 2. accept_invitation ───────────────────────────────────────────────────
-- Authenticated only. Creates pending club_members row from token.
-- Resolves club_id server-side — client never sees it.
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS TABLE(result_status text, club_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_club_id uuid;
  v_club_name text;
  v_revoked_at timestamptz;
  v_expires_at timestamptz;
  v_created_by uuid;
  v_uid uuid := auth.uid();
  v_existing_status text;
  v_requester_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Look up invitation
  SELECT ci.club_id, ci.revoked_at, ci.expires_at, ci.created_by
  INTO v_club_id, v_revoked_at, v_expires_at, v_created_by
  FROM public.club_invitations ci
  WHERE ci.token = p_token;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'invitation_invalid';
  END IF;

  IF v_revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'invitation_invalid';
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RAISE EXCEPTION 'invitation_invalid';
  END IF;

  -- Inviter must still be active
  IF NOT EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = v_club_id
      AND cm.user_id = v_created_by
      AND cm.status = 'active'
      AND cm.is_active = true
  ) THEN
    RAISE EXCEPTION 'invitation_invalid';
  END IF;

  -- Club must be active
  SELECT c.name INTO v_club_name
  FROM public.clubs c
  WHERE c.id = v_club_id AND c.status = 'active';

  IF v_club_name IS NULL THEN
    RAISE EXCEPTION 'invitation_invalid';
  END IF;

  -- Check existing membership
  SELECT cm.status INTO v_existing_status
  FROM public.club_members cm
  WHERE cm.club_id = v_club_id AND cm.user_id = v_uid;

  IF v_existing_status = 'active' THEN
    RETURN QUERY SELECT 'already_member'::text, v_club_name;
    RETURN;
  END IF;

  IF v_existing_status = 'pending' THEN
    RETURN QUERY SELECT 'already_pending'::text, v_club_name;
    RETURN;
  END IF;

  IF v_existing_status IN ('rejected', 'removed') THEN
    -- Re-request: reset to pending
    UPDATE public.club_members
    SET status = 'pending',
        requested_at = now(),
        rejected_at = NULL,
        removed_at = NULL,
        is_active = true
    WHERE club_id = v_club_id AND user_id = v_uid;
  ELSE
    -- New membership request
    INSERT INTO public.club_members (
      club_id, user_id, role, status, is_active, requested_at, member_association
    ) VALUES (
      v_club_id, v_uid, 'member', 'pending', true, now(), false
    );
  END IF;

  -- Get requester name for notification
  SELECT coalesce(p.first_name || ' ' || substr(p.last_name, 1, 1) || '.', 'A member')
  INTO v_requester_name
  FROM public.players p WHERE p.user_id = v_uid
  LIMIT 1;

  IF v_requester_name IS NULL THEN
    v_requester_name := 'A member';
  END IF;

  -- Notify club admins
  PERFORM notify_club_admins(
    v_club_id, 'club_join_request',
    jsonb_build_object(
      'club_id', v_club_id,
      'club_name', v_club_name,
      'requester_name', v_requester_name
    )
  );

  RETURN QUERY SELECT 'pending_approval'::text, v_club_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invitation(text) TO authenticated;


-- ─── 3. generate_invitation ─────────────────────────────────────────────────
-- Authenticated only. Returns existing active token or creates a new one.
CREATE OR REPLACE FUNCTION public.generate_invitation(p_club_id uuid)
RETURNS TABLE(invitation_id uuid, token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_existing_id uuid;
  v_existing_token text;
  v_new_token text;
  v_new_id uuid;
  v_attempts int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Verify caller is active member of the club
  IF NOT EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = p_club_id
      AND cm.user_id = v_uid
      AND cm.status = 'active'
      AND cm.is_active = true
  ) THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;

  -- Check for existing active (non-revoked) invitation
  SELECT ci.id, ci.token
  INTO v_existing_id, v_existing_token
  FROM public.club_invitations ci
  WHERE ci.club_id = p_club_id
    AND ci.created_by = v_uid
    AND ci.revoked_at IS NULL;

  IF v_existing_token IS NOT NULL THEN
    RETURN QUERY SELECT v_existing_id, v_existing_token;
    RETURN;
  END IF;

  -- Generate new token with retry on collision
  LOOP
    v_attempts := v_attempts + 1;
    v_new_token := generate_invite_token();

    BEGIN
      INSERT INTO public.club_invitations (club_id, created_by, token)
      VALUES (p_club_id, v_uid, v_new_token)
      RETURNING id INTO v_new_id;

      RETURN QUERY SELECT v_new_id, v_new_token;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempts >= 3 THEN
        RAISE EXCEPTION 'token_generation_failed';
      END IF;
      -- Retry with a new token
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_invitation(uuid) TO authenticated;


-- ─── 4. revoke_invitation ───────────────────────────────────────────────────
-- Authenticated only. Creator or club admin can revoke.
CREATE OR REPLACE FUNCTION public.revoke_invitation(p_invitation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_club_id uuid;
  v_created_by uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Look up invitation
  SELECT ci.club_id, ci.created_by
  INTO v_club_id, v_created_by
  FROM public.club_invitations ci
  WHERE ci.id = p_invitation_id
    AND ci.revoked_at IS NULL;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'invitation_not_found';
  END IF;

  -- Verify caller is creator or admin
  IF v_created_by != v_uid AND NOT EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = v_club_id
      AND cm.user_id = v_uid
      AND cm.role = 'admin'
      AND cm.status = 'active'
      AND cm.is_active = true
  ) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE public.club_invitations
  SET revoked_at = now()
  WHERE id = p_invitation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_invitation(uuid) TO authenticated;
