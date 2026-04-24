-- Include event date in cancellation notification payload
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
        'event_title', NEW.title,
        'event_date', NEW.date
      ),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;
