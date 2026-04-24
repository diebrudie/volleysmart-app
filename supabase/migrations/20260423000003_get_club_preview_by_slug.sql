-- RPC: get_club_preview_by_slug
-- Returns basic club info for the /join/:slug invite page.
-- SECURITY DEFINER so any authenticated user can preview a club before joining.

CREATE OR REPLACE FUNCTION public.get_club_preview_by_slug(p_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  image_url text,
  city text,
  country text,
  member_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
declare
  v_club_id uuid;
begin
  SELECT c.id INTO v_club_id
  FROM public.clubs c
  WHERE c.status = 'active'
    AND lower(c.slug) = lower(p_slug)
  LIMIT 1;

  IF v_club_id IS NULL THEN
    RETURN; -- empty result set = club not found
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.name,
    c.description,
    c.image_url,
    c.city,
    c.country,
    (
      SELECT count(*)
      FROM public.club_members cm
      WHERE cm.club_id = c.id
        AND cm.is_active = true
        AND cm.status = 'active'
    ) AS member_count
  FROM public.clubs c
  WHERE c.id = v_club_id;
END;
$$;

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION public.get_club_preview_by_slug(text) TO authenticated;
