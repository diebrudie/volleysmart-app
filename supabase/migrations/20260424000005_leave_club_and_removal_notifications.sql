-- Migration: Leave club RPC, admin removal RPC with notifications, fix approve_membership

-- ─── 1. leave_club RPC ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.leave_club(p_club_id uuid)
RETURNS TABLE(result_status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  v_member_id uuid;
  v_role text;
  v_admin_count int;
  v_member_name text;
  v_club_name text;
BEGIN
  -- Check caller is active member
  SELECT cm.id, cm.role INTO v_member_id, v_role
  FROM public.club_members cm
  WHERE cm.club_id = p_club_id
    AND cm.user_id = auth.uid()
    AND cm.status = 'active'
    AND cm.is_active = true;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Not an active member of this club';
  END IF;

  -- Block sole admin from leaving
  IF v_role = 'admin' THEN
    SELECT count(*) INTO v_admin_count
    FROM public.club_members cm
    WHERE cm.club_id = p_club_id
      AND cm.role = 'admin'
      AND cm.status = 'active'
      AND cm.is_active = true;

    IF v_admin_count <= 1 THEN
      result_status := 'sole_admin';
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;

  -- Deactivate membership
  UPDATE public.club_members
  SET is_active = false,
      status = 'removed',
      removed_at = now(),
      removed_by = auth.uid()
  WHERE id = v_member_id;

  -- Get names for notification
  SELECT coalesce(p.first_name || ' ' || substr(p.last_name, 1, 1) || '.', 'A member')
  INTO v_member_name
  FROM public.players p WHERE p.user_id = auth.uid()
  LIMIT 1;

  IF v_member_name IS NULL THEN
    v_member_name := 'A member';
  END IF;

  SELECT c.name INTO v_club_name
  FROM public.clubs c WHERE c.id = p_club_id;

  -- Notify remaining members
  PERFORM notify_club_members(
    p_club_id,
    'club_member_left',
    jsonb_build_object(
      'member_name', v_member_name,
      'club_name', v_club_name,
      'club_id', p_club_id
    ),
    auth.uid()  -- exclude the leaving user
  );

  result_status := 'left';
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.leave_club(uuid) TO authenticated;

-- ─── 2. remove_club_members RPC ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.remove_club_members(p_club_id uuid, p_user_ids uuid[])
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  v_uid uuid;
  v_member_name text;
  v_club_name text;
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.club_members cm
    WHERE cm.club_id = p_club_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'admin'
      AND cm.status = 'active'
      AND cm.is_active = true
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT c.name INTO v_club_name
  FROM public.clubs c WHERE c.id = p_club_id;

  -- Update all targeted members
  UPDATE public.club_members
  SET is_active = false,
      status = 'removed',
      removed_at = now(),
      removed_by = auth.uid()
  WHERE club_id = p_club_id
    AND user_id = ANY(p_user_ids)
    AND status = 'active'
    AND is_active = true;

  -- For each removed user: notify them + notify remaining members
  FOREACH v_uid IN ARRAY p_user_ids LOOP
    -- Get removed member's name
    SELECT coalesce(p.first_name || ' ' || substr(p.last_name, 1, 1) || '.', 'A member')
    INTO v_member_name
    FROM public.players p WHERE p.user_id = v_uid
    LIMIT 1;

    IF v_member_name IS NULL THEN
      v_member_name := 'A member';
    END IF;

    -- Notify the removed user
    INSERT INTO public.notifications (user_id, type, payload)
    VALUES (
      v_uid,
      'club_member_removed',
      jsonb_build_object(
        'club_name', v_club_name,
        'club_id', p_club_id
      )
    );

    -- Notify remaining members that someone was removed
    PERFORM notify_club_members(
      p_club_id,
      'club_member_left',
      jsonb_build_object(
        'member_name', v_member_name,
        'club_name', v_club_name,
        'club_id', p_club_id
      ),
      v_uid  -- exclude the removed user (already notified separately)
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.remove_club_members(uuid, uuid[]) TO authenticated;

-- ─── 3. Fix approve_membership — add is_active = true ─────────────────────────
CREATE OR REPLACE FUNCTION public.approve_membership(p_membership_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  v_club uuid;
  v_member_user_id uuid;
  v_member_name text;
  v_club_name text;
BEGIN
  SELECT club_id INTO v_club FROM public.club_members WHERE id = p_membership_id;

  -- RLS check: caller must be active admin of that club
  IF NOT EXISTS (
    SELECT 1 FROM public.club_members me
    WHERE me.club_id = v_club AND me.user_id = auth.uid()
      AND me.role = 'admin' AND me.status = 'active' AND me.is_active = true
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.club_members
  SET status = 'active',
      is_active = true,
      activated_at = now(),
      rejected_at = NULL,
      removed_at = NULL,
      removed_by = NULL
  WHERE id = p_membership_id;

  -- Get approved member info
  SELECT cm.user_id INTO v_member_user_id
  FROM public.club_members cm WHERE cm.id = p_membership_id;

  SELECT coalesce(p.first_name || ' ' || substr(p.last_name, 1, 1) || '.', 'A member')
  INTO v_member_name
  FROM public.players p WHERE p.user_id = v_member_user_id
  LIMIT 1;

  IF v_member_name IS NULL THEN
    v_member_name := 'A member';
  END IF;

  SELECT c.name INTO v_club_name FROM public.clubs c WHERE c.id = v_club;

  -- Notify the approved member
  INSERT INTO public.notifications (user_id, type, payload)
  VALUES (
    v_member_user_id,
    'club_join_accepted',
    jsonb_build_object('club_id', v_club, 'club_name', v_club_name)
  );

  -- Notify other club members
  PERFORM notify_club_members(
    v_club,
    'club_member_joined',
    jsonb_build_object(
      'club_id', v_club,
      'club_name', v_club_name,
      'member_name', v_member_name
    ),
    v_member_user_id
  );
END;
$$;
