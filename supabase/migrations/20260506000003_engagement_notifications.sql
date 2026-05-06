-- Welcome notification trigger: fires immediately when a player completes onboarding
CREATE OR REPLACE FUNCTION public.send_welcome_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND (NEW.is_temporary IS NULL OR NEW.is_temporary = false) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.notification_preferences np
      WHERE np.user_id = NEW.user_id
        AND np.notification_type = 'engagement_welcome'
        AND np.in_app = false
    ) THEN
      INSERT INTO public.notifications (user_id, type, payload)
      VALUES (NEW.user_id, 'engagement_welcome', '{}'::jsonb);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_welcome_notification ON public.players;
CREATE TRIGGER trg_welcome_notification
  AFTER INSERT ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.send_welcome_notification();

-- Daily engagement notification cron function
-- Sends max 1 engagement notification per eligible user per run.
-- Rules: 3-day cooldown between engagement notifications, 30-day window from signup.
CREATE OR REPLACE FUNCTION public.send_engagement_notifications()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  u RECORD;
  v_type text;
  v_payload jsonb;
  v_pub_event RECORD;
  v_admin_club_id uuid;
BEGIN
  FOR u IN
    SELECT
      p.user_id,
      p.id AS player_id,
      p.created_at AS player_created_at,
      au.last_sign_in_at,
      EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0 AS days_since_signup
    FROM public.players p
    JOIN auth.users au ON au.id = p.user_id
    WHERE p.user_id IS NOT NULL
      AND (p.is_temporary IS NULL OR p.is_temporary = false)
      AND p.created_at >= NOW() - INTERVAL '30 days'
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = p.user_id
          AND n.type LIKE 'engagement_%'
          AND n.created_at > NOW() - INTERVAL '3 days'
      )
  LOOP
    v_type := NULL;
    v_payload := '{}'::jsonb;

    -- Priority 1: Create club (day 1+, no active club memberships)
    IF u.days_since_signup >= 1
       AND NOT EXISTS (
         SELECT 1 FROM public.club_members cm
         WHERE cm.user_id = u.user_id
           AND cm.is_active = true
           AND cm.status = 'active'
       )
    THEN
      v_type := 'engagement_create_club';

    -- Priority 2: Create event (day 3+, is admin of a club, no events in last 14 days)
    ELSIF u.days_since_signup >= 3
       AND EXISTS (
         SELECT 1 FROM public.club_members cm
         WHERE cm.user_id = u.user_id
           AND cm.is_active = true
           AND cm.status = 'active'
           AND cm.role = 'admin'
       )
       AND NOT EXISTS (
         SELECT 1 FROM public.planned_events pe
         WHERE pe.created_by = u.user_id
           AND pe.created_at > NOW() - INTERVAL '14 days'
       )
    THEN
      v_type := 'engagement_create_event';
      SELECT cm.club_id INTO v_admin_club_id
      FROM public.club_members cm
      WHERE cm.user_id = u.user_id
        AND cm.is_active = true
        AND cm.status = 'active'
        AND cm.role = 'admin'
      LIMIT 1;
      v_payload := jsonb_build_object('club_id', v_admin_club_id);

    -- Priority 3: Public event nearby (public event created in last 2 days, user hasn't RSVPd)
    ELSIF EXISTS (
      SELECT 1 FROM public.planned_events pe
      WHERE pe.is_public = true
        AND pe.status IN ('open', 'confirmed')
        AND pe.date >= CURRENT_DATE
        AND pe.created_at > NOW() - INTERVAL '2 days'
        AND NOT EXISTS (
          SELECT 1 FROM public.event_rsvp er
          WHERE er.event_id = pe.id
            AND er.player_id = u.player_id
        )
    )
    THEN
      SELECT pe.id, pe.title INTO v_pub_event
      FROM public.planned_events pe
      WHERE pe.is_public = true
        AND pe.status IN ('open', 'confirmed')
        AND pe.date >= CURRENT_DATE
        AND pe.created_at > NOW() - INTERVAL '2 days'
        AND NOT EXISTS (
          SELECT 1 FROM public.event_rsvp er
          WHERE er.event_id = pe.id
            AND er.player_id = u.player_id
        )
      ORDER BY pe.date ASC LIMIT 1;

      v_type := 'engagement_public_event';
      v_payload := jsonb_build_object(
        'event_id', v_pub_event.id,
        'event_title', v_pub_event.title
      );

    -- Priority 4: Come back (day 7+, no sign-in or RSVP in 7 days)
    ELSIF u.days_since_signup >= 7
       AND (u.last_sign_in_at IS NULL OR u.last_sign_in_at < NOW() - INTERVAL '7 days')
       AND NOT EXISTS (
         SELECT 1 FROM public.event_rsvp er
         WHERE er.player_id = u.player_id
           AND er.responded_at > NOW() - INTERVAL '7 days'
       )
    THEN
      v_type := 'engagement_come_back';
    END IF;

    -- Insert if type matched and user preferences allow it
    IF v_type IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM public.notification_preferences np
         WHERE np.user_id = u.user_id
           AND np.notification_type = v_type
           AND np.in_app = false
       )
    THEN
      INSERT INTO public.notifications (user_id, type, payload)
      VALUES (u.user_id, v_type, v_payload);
    END IF;
  END LOOP;
END;
$$;

-- Schedule daily at 9 AM UTC (1 hour after RSVP deadline cron)
SELECT cron.schedule(
  'engagement-reminders',
  '0 9 * * *',
  'SELECT public.send_engagement_notifications()'
);
