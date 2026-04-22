-- Migration: RSVP deadline reminder via pg_cron
-- Runs daily at 8am UTC, notifies club members who haven't responded
-- to events whose rsvp_deadline is today.

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.send_rsvp_deadline_reminders()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  ev RECORD;
BEGIN
  FOR ev IN
    SELECT pe.id AS event_id, pe.title, pe.date, pe.club_id
    FROM public.planned_events pe
    WHERE pe.rsvp_deadline::date = CURRENT_DATE
      AND pe.status = 'open'
      AND pe.club_id IS NOT NULL
  LOOP
    INSERT INTO public.notifications (user_id, type, payload)
    SELECT cm.user_id, 'rsvp_deadline_reminder',
      jsonb_build_object(
        'club_id', ev.club_id,
        'event_id', ev.event_id,
        'event_title', ev.title,
        'event_date', ev.date
      )
    FROM public.club_members cm
    WHERE cm.club_id = ev.club_id
      AND cm.status = 'active'
      AND cm.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.event_rsvp er
        JOIN public.players p ON p.id = er.player_id
        WHERE er.event_id = ev.event_id
          AND p.user_id = cm.user_id
      );
  END LOOP;
END;
$$;

SELECT cron.schedule(
  'rsvp-deadline-reminders',
  '0 8 * * *',
  'SELECT public.send_rsvp_deadline_reminders()'
);
