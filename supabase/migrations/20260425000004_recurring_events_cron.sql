-- Recurring events: auto-generate next instance via pg_cron
-- Weekly events: generate 5 days ahead
-- Monthly events: generate 14 days ahead

CREATE OR REPLACE FUNCTION public.generate_recurring_event_instances()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
DECLARE
  ev RECORD;
  next_date date;
  latest_instance_date date;
  v_rsvp_offset interval;
  v_rsvp_deadline timestamptz;
BEGIN
  FOR ev IN
    SELECT pe.*
    FROM public.planned_events pe
    WHERE pe.recurrence_rule IS NOT NULL
      AND pe.recurrence_cancelled_at IS NULL
      AND pe.status != 'cancelled'
      AND pe.recurrence_parent_id IS NULL
  LOOP
    -- Find the latest instance date (parent or child, non-cancelled)
    SELECT COALESCE(MAX(child.date), ev.date) INTO latest_instance_date
    FROM public.planned_events child
    WHERE (child.recurrence_parent_id = ev.id OR child.id = ev.id)
      AND child.status != 'cancelled';

    -- Compute RSVP deadline offset from parent
    IF ev.rsvp_deadline IS NOT NULL THEN
      v_rsvp_offset := ev.date - ev.rsvp_deadline::date;
    ELSE
      v_rsvp_offset := NULL;
    END IF;

    IF ev.recurrence_rule = 'weekly' THEN
      IF latest_instance_date < CURRENT_DATE + INTERVAL '5 days' THEN
        next_date := latest_instance_date + INTERVAL '7 days';
        IF next_date >= CURRENT_DATE THEN
          v_rsvp_deadline := CASE WHEN v_rsvp_offset IS NOT NULL
            THEN (next_date - v_rsvp_offset)::timestamptz
            ELSE NULL END;

          INSERT INTO public.planned_events (
            club_id, created_by, title, event_type, date,
            start_time, end_time, location_id, is_public,
            max_players, min_players, notes, rsvp_deadline,
            status, recurrence_parent_id
          ) VALUES (
            ev.club_id, ev.created_by, ev.title, ev.event_type, next_date,
            ev.start_time, ev.end_time, ev.location_id, ev.is_public,
            ev.max_players, ev.min_players, ev.notes, v_rsvp_deadline,
            'open', ev.id
          );
        END IF;
      END IF;

    ELSIF ev.recurrence_rule = 'monthly' THEN
      IF latest_instance_date < CURRENT_DATE + INTERVAL '14 days' THEN
        next_date := latest_instance_date + INTERVAL '1 month';
        IF next_date >= CURRENT_DATE THEN
          v_rsvp_deadline := CASE WHEN v_rsvp_offset IS NOT NULL
            THEN (next_date - v_rsvp_offset)::timestamptz
            ELSE NULL END;

          INSERT INTO public.planned_events (
            club_id, created_by, title, event_type, date,
            start_time, end_time, location_id, is_public,
            max_players, min_players, notes, rsvp_deadline,
            status, recurrence_parent_id
          ) VALUES (
            ev.club_id, ev.created_by, ev.title, ev.event_type, next_date,
            ev.start_time, ev.end_time, ev.location_id, ev.is_public,
            ev.max_players, ev.min_players, ev.notes, v_rsvp_deadline,
            'open', ev.id
          );
        END IF;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Schedule daily at 3am UTC
SELECT cron.schedule(
  'generate-recurring-events',
  '0 3 * * *',
  'SELECT public.generate_recurring_event_instances()'
);

-- Update event_created trigger to skip auto-generated recurring instances
CREATE OR REPLACE FUNCTION public.trg_notify_event_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
BEGIN
  -- Skip notifications for auto-generated recurring instances
  IF NEW.recurrence_parent_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

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
