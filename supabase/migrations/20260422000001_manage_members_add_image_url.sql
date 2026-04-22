-- Add image_url to manage_members_list RPC so admins can see pending member avatars
-- Must DROP first because return type is changing (adding image_url column)
DROP FUNCTION IF EXISTS "public"."manage_members_list"("uuid");

CREATE FUNCTION "public"."manage_members_list"("p_club_id" "uuid")
RETURNS TABLE(
  "membership_id" "uuid",
  "club_id" "uuid",
  "user_id" "uuid",
  "first_name" "text",
  "last_name" "text",
  "role" "text",
  "status" "public"."membership_status",
  "requested_at" timestamp with time zone,
  "activated_at" timestamp with time zone,
  "removed_at" timestamp with time zone,
  "rejected_at" timestamp with time zone,
  "member_association" boolean,
  "image_url" "text"
)
LANGUAGE "sql" SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
  select
    cm.id                                           as membership_id,
    cm.club_id,
    cm.user_id,
    (au.raw_user_meta_data->>'first_name')::text    as first_name,
    (au.raw_user_meta_data->>'last_name')::text     as last_name,
    cm.role,
    cm.status,
    cm.requested_at,
    cm.activated_at,
    cm.removed_at,
    cm.rejected_at,
    cm.member_association                            as member_association,
    p.image_url::text                                as image_url
  from public.club_members cm
  left join auth.users au on au.id = cm.user_id
  left join public.players p on p.user_id = cm.user_id
  where cm.club_id = p_club_id
    and exists (
      select 1
      from public.club_members me
      where me.club_id = p_club_id
        and me.user_id = auth.uid()
        and me.status  = 'active'
    );
$$;

-- Restore grants
GRANT ALL ON FUNCTION "public"."manage_members_list"("p_club_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."manage_members_list"("p_club_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."manage_members_list"("p_club_id" "uuid") TO "service_role";
