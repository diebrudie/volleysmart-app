-- Migration: Add notification triggers for all notification types
-- Depends on: notifications table from 20260417000001

-- ─── 1. Add notifications to realtime publication ───────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.notifications;
  END IF;
END $$;

-- ─── 2. Helper: notify all active members of a club ──────────────────────────
CREATE OR REPLACE FUNCTION public.notify_club_members(
  p_club_id uuid,
  p_type text,
  p_payload jsonb,
  p_exclude_user_id uuid DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, payload)
  SELECT cm.user_id, p_type, p_payload
  FROM public.club_members cm
  WHERE cm.club_id = p_club_id
    AND cm.status = 'active'
    AND cm.is_active = true
    AND (p_exclude_user_id IS NULL OR cm.user_id != p_exclude_user_id);
END;
$$;

-- ─── 3. Helper: notify only admins of a club ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_club_admins(
  p_club_id uuid,
  p_type text,
  p_payload jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, payload)
  SELECT cm.user_id, p_type, p_payload
  FROM public.club_members cm
  WHERE cm.club_id = p_club_id
    AND cm.status = 'active'
    AND cm.is_active = true
    AND cm.role = 'admin';
END;
$$;

-- ─── 4a. Redefine request_join_by_slug with notification ─────────────────────
CREATE OR REPLACE FUNCTION public.request_join_by_slug(
  p_slug text,
  p_member_association boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  v_club_id uuid;
  v_existing_status text;
  v_requester_name text;
BEGIN
  -- Find active club by slug
  SELECT id INTO v_club_id
  FROM public.clubs
  WHERE status = 'active'
    AND lower(slug) = lower(p_slug)
  LIMIT 1;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'club_not_found_or_deleted';
  END IF;

  -- Check if the user already has a membership row for this club
  SELECT status INTO v_existing_status
  FROM public.club_members
  WHERE club_id = v_club_id AND user_id = auth.uid();

  IF v_existing_status IS NOT NULL THEN
    -- Already active or pending → raise unique_violation for frontend to handle
    IF v_existing_status IN ('active', 'pending') THEN
      RAISE EXCEPTION 'club_members_club_id_user_id_key'
        USING ERRCODE = '23505';
    END IF;

    -- Rejected or removed → reset to pending (allow re-request)
    UPDATE public.club_members
    SET status = 'pending',
        requested_at = now(),
        rejected_at = NULL,
        removed_at = NULL,
        member_association = coalesce(p_member_association, false)
    WHERE club_id = v_club_id AND user_id = auth.uid();
  ELSE
    -- No existing row → insert new membership request
    INSERT INTO public.club_members (
      club_id, user_id, role, status, is_active, requested_at, member_association
    ) VALUES (
      v_club_id, auth.uid(), 'member', 'pending', true, now(),
      coalesce(p_member_association, false)
    );
  END IF;

  -- Get requester name
  SELECT coalesce(p.first_name || ' ' || substr(p.last_name, 1, 1) || '.', 'A member')
  INTO v_requester_name
  FROM public.players p WHERE p.user_id = auth.uid()
  LIMIT 1;

  IF v_requester_name IS NULL THEN
    v_requester_name := 'A member';
  END IF;

  -- Notify club admins
  PERFORM notify_club_admins(
    v_club_id, 'club_join_request',
    jsonb_build_object(
      'club_id', v_club_id,
      'club_name', (SELECT name FROM public.clubs WHERE id = v_club_id),
      'requester_name', v_requester_name
    )
  );
END;
$$;

-- ─── 4b. Redefine approve_membership with notifications ──────────────────────
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
      AND me.role = 'admin' AND me.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.club_members
  SET status = 'active', activated_at = now(), rejected_at = NULL, removed_at = NULL
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

  SELECT name INTO v_club_name FROM public.clubs WHERE id = v_club;

  -- Notify the approved member
  INSERT INTO public.notifications (user_id, type, payload)
  VALUES (v_member_user_id, 'club_join_accepted', jsonb_build_object(
    'club_id', v_club,
    'club_name', v_club_name
  ));

  -- Notify all other active members
  PERFORM notify_club_members(
    v_club, 'club_member_joined',
    jsonb_build_object(
      'club_id', v_club,
      'club_name', v_club_name,
      'member_name', v_member_name
    ),
    v_member_user_id
  );
END;
$$;

-- ─── 4c. Redefine reject_membership with notification ────────────────────────
CREATE OR REPLACE FUNCTION public.reject_membership(p_membership_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  v_club uuid;
  v_member_user_id uuid;
BEGIN
  SELECT club_id INTO v_club FROM public.club_members WHERE id = p_membership_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.club_members me
    WHERE me.club_id = v_club AND me.user_id = auth.uid()
      AND me.role = 'admin' AND me.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.club_members
  SET status = 'rejected', rejected_at = now()
  WHERE id = p_membership_id;

  -- Get rejected member's user_id
  SELECT cm.user_id INTO v_member_user_id
  FROM public.club_members cm WHERE cm.id = p_membership_id;

  -- Notify the rejected user
  INSERT INTO public.notifications (user_id, type, payload)
  VALUES (v_member_user_id, 'club_join_rejected', jsonb_build_object(
    'club_id', v_club,
    'club_name', (SELECT name FROM public.clubs WHERE id = v_club)
  ));
END;
$$;

-- ─── 5a. Trigger: event_created ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_notify_event_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
BEGIN
  IF NEW.club_id IS NOT NULL AND NEW.status != 'completed' THEN
    PERFORM notify_club_members(
      NEW.club_id, 'event_created',
      jsonb_build_object(
        'club_id', NEW.club_id,
        'club_name', (SELECT name FROM public.clubs WHERE id = NEW.club_id),
        'event_id', NEW.id,
        'event_title', NEW.title,
        'event_date', NEW.date
      ),
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_event_created
  AFTER INSERT ON public.planned_events
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_event_created();

-- ─── 5b. Trigger: event_cancelled ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_notify_event_cancelled()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' AND NEW.club_id IS NOT NULL THEN
    PERFORM notify_club_members(
      NEW.club_id, 'event_cancelled',
      jsonb_build_object(
        'club_id', NEW.club_id,
        'club_name', (SELECT name FROM public.clubs WHERE id = NEW.club_id),
        'event_id', NEW.id,
        'event_title', NEW.title
      ),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_event_cancelled
  AFTER UPDATE ON public.planned_events
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_event_cancelled();

-- ─── 5c. Trigger: event_rsvp ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_notify_event_rsvp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  v_event_club_id uuid;
  v_event_title text;
  v_player_name text;
  v_player_user_id uuid;
BEGIN
  SELECT pe.club_id, pe.title INTO v_event_club_id, v_event_title
  FROM public.planned_events pe WHERE pe.id = NEW.event_id;

  SELECT p.user_id, coalesce(p.first_name || ' ' || substr(p.last_name, 1, 1) || '.', 'A player')
  INTO v_player_user_id, v_player_name
  FROM public.players p WHERE p.id = NEW.player_id;

  IF v_event_club_id IS NOT NULL THEN
    PERFORM notify_club_members(
      v_event_club_id, 'event_rsvp',
      jsonb_build_object(
        'club_id', v_event_club_id,
        'event_id', NEW.event_id,
        'event_title', v_event_title,
        'player_name', v_player_name,
        'rsvp_status', NEW.status::text
      ),
      v_player_user_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_event_rsvp
  AFTER INSERT OR UPDATE ON public.event_rsvp
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_event_rsvp();

-- ─── 5d. Trigger: game_started ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_notify_game_started()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  v_event_title text;
  v_club_name text;
BEGIN
  IF NEW.planned_event_id IS NOT NULL AND NEW.club_id IS NOT NULL THEN
    SELECT pe.title INTO v_event_title
    FROM public.planned_events pe WHERE pe.id = NEW.planned_event_id;

    SELECT c.name INTO v_club_name
    FROM public.clubs c WHERE c.id = NEW.club_id;

    PERFORM notify_club_members(
      NEW.club_id, 'game_started',
      jsonb_build_object(
        'club_id', NEW.club_id,
        'club_name', v_club_name,
        'event_id', NEW.planned_event_id,
        'event_title', v_event_title,
        'match_day_id', NEW.id
      ),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_game_started
  AFTER INSERT ON public.match_days
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_game_started();
