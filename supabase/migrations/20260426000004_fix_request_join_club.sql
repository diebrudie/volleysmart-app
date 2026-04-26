-- Fix request_join_club RPC:
-- 1. Update requested_at = now() on re-request
-- 2. Fix notification type: 'join_request' → 'club_join_request'
-- 3. Fix payload key: 'user_name' → 'requester_name'

CREATE OR REPLACE FUNCTION public.request_join_club(p_club_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing record;
  v_requester_name text;
BEGIN
  -- Check if already member or pending
  SELECT status, is_active INTO v_existing
  FROM club_members WHERE club_id = p_club_id AND user_id = v_user_id;

  IF v_existing IS NOT NULL THEN
    IF v_existing.status = 'active' AND v_existing.is_active THEN
      RETURN jsonb_build_object('status', 'already_member');
    ELSIF v_existing.status = 'pending' THEN
      RETURN jsonb_build_object('status', 'already_pending');
    END IF;
    -- Re-request after rejection/removal: update existing row
    UPDATE club_members
    SET status = 'pending', is_active = false, removed_by = NULL,
        requested_at = now(), rejected_at = NULL, removed_at = NULL
    WHERE club_id = p_club_id AND user_id = v_user_id;
  ELSE
    INSERT INTO club_members (club_id, user_id, role, status, is_active)
    VALUES (p_club_id, v_user_id, 'member', 'pending', false);
  END IF;

  -- Get requester name
  SELECT (p.first_name || ' ' || left(p.last_name, 1) || '.')::text
  INTO v_requester_name
  FROM players p WHERE p.user_id = v_user_id LIMIT 1;

  IF v_requester_name IS NULL THEN
    v_requester_name := 'Someone';
  END IF;

  -- Notify club admins with correct type and payload
  PERFORM notify_club_admins(
    p_club_id, 'club_join_request',
    jsonb_build_object(
      'club_id', p_club_id,
      'club_name', (SELECT name FROM clubs WHERE id = p_club_id),
      'requester_name', v_requester_name
    )
  );

  RETURN jsonb_build_object('status', 'pending_approval');
END;
$$;
