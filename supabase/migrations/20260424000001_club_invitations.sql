-- ─── Club Invitations table + token generator ──────────────────────────────
-- Token-based invite links replacing slug-based /join/:slug system.
-- Any active member can generate one invite link per club.
-- Admins must approve join requests before user becomes active member.

-- 1. Token generator function
-- Generates 8-char token from a safe alphabet (no ambiguous chars: 0/O, 1/l/I)
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_alphabet text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  v_alphabet_len int := 54;
  v_bytes bytea;
  v_token text := '';
  v_i int;
BEGIN
  v_bytes := gen_random_bytes(8);
  FOR v_i IN 0..7 LOOP
    v_token := v_token || substr(v_alphabet, (get_byte(v_bytes, v_i) % v_alphabet_len) + 1, 1);
  END LOOP;
  RETURN v_token;
END;
$$;

-- 2. Club invitations table
CREATE TABLE public.club_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One active (non-revoked) invite per member per club
-- Allows keeping revoked rows for audit trail
CREATE UNIQUE INDEX idx_club_invitations_active
  ON public.club_invitations(club_id, created_by)
  WHERE revoked_at IS NULL;

-- 3. Enable RLS
ALTER TABLE public.club_invitations ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- SELECT: creator can see their own invitations
CREATE POLICY "Users can view own invitations"
  ON public.club_invitations
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- SELECT: admin can see all invitations for clubs they administer
CREATE POLICY "Admins can view club invitations"
  ON public.club_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_members cm
      WHERE cm.club_id = club_invitations.club_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
        AND cm.status = 'active'
        AND cm.is_active = true
    )
  );

-- INSERT: active club members can create invitations
CREATE POLICY "Active members can create invitations"
  ON public.club_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.club_members cm
      WHERE cm.club_id = club_invitations.club_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
        AND cm.is_active = true
    )
  );

-- UPDATE: creator or club admin can update (for revoking)
CREATE POLICY "Creator or admin can update invitations"
  ON public.club_invitations
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.club_members cm
      WHERE cm.club_id = club_invitations.club_id
        AND cm.user_id = auth.uid()
        AND cm.role = 'admin'
        AND cm.status = 'active'
        AND cm.is_active = true
    )
  );

-- No DELETE policy — invitations are revoked, not deleted
-- No anon SELECT — token validation happens via SECURITY DEFINER RPC
