-- Allow any authenticated user to view discoverable clubs
DROP POLICY IF EXISTS "Anyone can view discoverable clubs" ON public.clubs;
CREATE POLICY "Anyone can view discoverable clubs"
  ON public.clubs FOR SELECT TO authenticated
  USING (is_club_discoverable = true AND status = 'active');

-- RPC: request to join a club (for discoverable clubs, no invite token needed)
CREATE OR REPLACE FUNCTION public.request_join_club(p_club_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing record;
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
    UPDATE club_members SET status = 'pending', is_active = false, removed_by = NULL
    WHERE club_id = p_club_id AND user_id = v_user_id;
  ELSE
    INSERT INTO club_members (club_id, user_id, role, status, is_active)
    VALUES (p_club_id, v_user_id, 'member', 'pending', false);
  END IF;

  -- Notify club admins
  PERFORM notify_club_admins(
    p_club_id, 'join_request',
    jsonb_build_object(
      'club_id', p_club_id,
      'club_name', (SELECT name FROM clubs WHERE id = p_club_id),
      'user_id', v_user_id,
      'user_name', (SELECT first_name || ' ' || last_name FROM players WHERE user_id = v_user_id)
    )
  );

  RETURN jsonb_build_object('status', 'pending_approval');
END;
$$;
