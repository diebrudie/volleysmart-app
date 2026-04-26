-- Allow anyone to get member count for discoverable clubs.
-- Needed because club_members RLS restricts non-members from reading rows.
CREATE OR REPLACE FUNCTION public.get_club_member_count(p_club_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO public AS $$
BEGIN
  RETURN (
    SELECT count(*)::integer
    FROM club_members
    WHERE club_id = p_club_id
      AND is_active = true
      AND status = 'active'
  );
END;
$$;
