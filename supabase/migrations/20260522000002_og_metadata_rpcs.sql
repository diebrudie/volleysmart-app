-- RPC functions for OG metadata (bypasses RLS via SECURITY DEFINER)
-- Returns minimal public metadata for social preview cards

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
    'location_address', l.address
  )
  FROM planned_events pe
  LEFT JOIN locations l ON l.id = pe.location_id
  WHERE pe.id = event_id;
$$;

CREATE OR REPLACE FUNCTION public.get_club_og_metadata(club_id uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT json_build_object(
    'name', c.name,
    'description', c.description,
    'city', c.city,
    'country', c.country
  )
  FROM clubs c
  WHERE c.id = club_id;
$$;

-- Allow anon and authenticated roles to call these
GRANT EXECUTE ON FUNCTION public.get_event_og_metadata(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_club_og_metadata(uuid) TO anon, authenticated;
