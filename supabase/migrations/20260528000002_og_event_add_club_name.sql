CREATE OR REPLACE FUNCTION public.get_event_og_metadata(event_id uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT json_build_object(
    'title', pe.title,
    'event_type', pe.event_type,
    'activity_type', pe.activity_type,
    'date', pe.date,
    'start_time', pe.start_time,
    'location_name', l.name,
    'location_address', l.address,
    'club_name', (
      SELECT c.name
      FROM event_clubs ec
      JOIN clubs c ON c.id = ec.club_id
      WHERE ec.event_id = pe.id
      LIMIT 1
    )
  )
  FROM planned_events pe
  LEFT JOIN locations l ON l.id = pe.location_id
  WHERE pe.id = get_event_og_metadata.event_id;
$$;
