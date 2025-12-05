

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."club_status" AS ENUM (
    'active',
    'deleted'
);


ALTER TYPE "public"."club_status" OWNER TO "postgres";


CREATE TYPE "public"."membership_status" AS ENUM (
    'pending',
    'active',
    'removed',
    'rejected'
);


ALTER TYPE "public"."membership_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_membership"("p_membership_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE v_club uuid;
BEGIN
  SELECT club_id INTO v_club FROM public.club_members WHERE id = p_membership_id;

  -- RLS check: caller must be active admin of that club
  IF NOT EXISTS (
    SELECT 1 FROM public.club_members me
    WHERE me.club_id = v_club AND me.user_id = auth.uid()
      AND me.role = 'admin' AND me.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.club_members
  SET status = 'active', activated_at = now(), rejected_at = NULL, removed_at = NULL
  WHERE id = p_membership_id;
END$$;


ALTER FUNCTION "public"."approve_membership"("p_membership_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_view_profile"("viewed_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM club_members my
    JOIN club_members their
      ON my.club_id = their.club_id
    WHERE my.user_id = auth.uid()
      AND their.user_id = viewed_user_id
  );
$$;


ALTER FUNCTION "public"."can_view_profile"("viewed_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."change_member_role"("p_membership_id" "uuid", "p_new_role" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE v_row public.club_members%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.club_members WHERE id = p_membership_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.club_members me
    WHERE me.club_id = v_row.club_id AND me.user_id = auth.uid()
      AND me.role = 'admin' AND me.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.club_members
  SET role = p_new_role
  WHERE id = p_membership_id;
END$$;


ALTER FUNCTION "public"."change_member_role"("p_membership_id" "uuid", "p_new_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_is_club_member"("club_uuid" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.club_members 
    WHERE club_id = club_uuid AND user_id = user_uuid
  );
END;
$$;


ALTER FUNCTION "public"."check_is_club_member"("club_uuid" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_one_primary_position"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- If we're setting this position as primary
  IF NEW.is_primary THEN
    -- Make sure no other position for this player is set as primary
    UPDATE public.player_positions 
    SET is_primary = false 
    WHERE player_id = NEW.player_id 
      AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_one_primary_position"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."club_has_members"("club_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.club_members 
    WHERE club_id = club_uuid
  );
END;
$$;


ALTER FUNCTION "public"."club_has_members"("club_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."club_members_normalize"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_status text;
  now_ts     timestamptz := now();
BEGIN
  /* INSERT path (same as before) */
  IF TG_OP = 'INSERT' THEN
    new_status := COALESCE(NEW.status::text, '');

    IF NEW.role = 'admin' AND (new_status = '' OR new_status = 'active') THEN
      NEW.status       := 'active';
      NEW.is_active    := true;
      NEW.joined_at    := COALESCE(NEW.joined_at, now_ts);
      NEW.requested_at := COALESCE(NEW.requested_at, now_ts);
      NEW.activated_at := COALESCE(NEW.activated_at, now_ts);
      RETURN NEW;
    END IF;

    IF new_status = '' THEN
      NEW.status := 'pending';
    END IF;

    IF NEW.status = 'pending'::membership_status THEN
      NEW.is_active    := true;
      NEW.requested_at := COALESCE(NEW.requested_at, now_ts);
      NEW.joined_at    := NULL;
      NEW.activated_at := NULL;
      NEW.rejected_at  := NULL;
      NEW.removed_at   := NULL;
      NEW.removed_by   := NULL;
      RETURN NEW;
    ELSIF NEW.status = 'active'::membership_status THEN
      NEW.is_active    := true;
      NEW.joined_at    := COALESCE(NEW.joined_at, now_ts);
      NEW.activated_at := COALESCE(NEW.activated_at, now_ts);
      RETURN NEW;
    ELSIF NEW.status = 'rejected'::membership_status THEN
      NEW.is_active    := false;
      NEW.rejected_at  := COALESCE(NEW.rejected_at, now_ts);
      NEW.removed_at   := NULL;
      NEW.removed_by   := NULL;
      RETURN NEW;
    ELSIF NEW.status = 'removed'::membership_status THEN
      NEW.is_active    := false;
      NEW.removed_at   := COALESCE(NEW.removed_at, now_ts);
      NEW.removed_by   := COALESCE(NEW.removed_by, auth.uid());
      RETURN NEW;
    END IF;

    RETURN NEW;
  END IF;

  /* UPDATE path */
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'active'::membership_status THEN
      NEW.is_active    := true;
      NEW.joined_at    := COALESCE(NEW.joined_at, OLD.joined_at, now_ts);
      NEW.activated_at := COALESCE(NEW.activated_at, now_ts);
    ELSIF NEW.status = 'pending'::membership_status THEN
      NEW.is_active    := true;
      NEW.requested_at := COALESCE(NEW.requested_at, OLD.requested_at, now_ts);
      NEW.activated_at := NULL;
      NEW.rejected_at  := NULL;
      NEW.removed_at   := NULL;
      NEW.removed_by   := NULL;
    ELSIF NEW.status = 'rejected'::membership_status THEN
      NEW.is_active    := false;
      NEW.rejected_at  := COALESCE(NEW.rejected_at, now_ts);
      NEW.removed_at   := NULL;
      NEW.removed_by   := NULL;
    ELSIF NEW.status = 'removed'::membership_status THEN
      NEW.is_active    := false;
      NEW.removed_at   := COALESCE(NEW.removed_at, now_ts);
      NEW.removed_by   := COALESCE(NEW.removed_by, auth.uid());
    END IF;

    RETURN NEW;
  ELSIF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    /* If only is_active changed, derive status conservatively */
    IF NEW.is_active = true THEN
      -- Promote to active if not explicitly pending/rejected
      IF OLD.status <> 'pending'::membership_status
         AND OLD.status <> 'rejected'::membership_status THEN
        NEW.status       := 'active'::membership_status;
        NEW.activated_at := COALESCE(NEW.activated_at, now_ts);
        NEW.joined_at    := COALESCE(NEW.joined_at, OLD.joined_at, now_ts);
      END IF;
    ELSE
      -- Demote active -> removed; preserve pending/rejected
      IF OLD.status = 'active'::membership_status THEN
        NEW.status     := 'removed'::membership_status;
        NEW.removed_at := COALESCE(NEW.removed_at, now_ts);
        NEW.removed_by := COALESCE(NEW.removed_by, auth.uid());
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."club_members_normalize"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."clubs_insert_creator_admin"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.club_members (
    id,
    club_id,
    user_id,
    role,
    status,
    requested_at,
    activated_at
  )
  VALUES (
    gen_random_uuid(),
    NEW.id,
    NEW.created_by,
    'admin',
    'active',
    now(),
    now()
  )
  ON CONFLICT (club_id, user_id)
  DO UPDATE SET
    role         = EXCLUDED.role,
    status       = EXCLUDED.status,
    activated_at = EXCLUDED.activated_at;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."clubs_insert_creator_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_or_reuse_guest"("p_club_id" "uuid", "p_first_name" "text", "p_last_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_first_ci  text := lower(btrim(p_first_name));
  v_last_ci   text := lower(btrim(p_last_name));
  v_player_id uuid;
BEGIN
  -- Try to reuse an existing guest in this club
  SELECT g.player_id
    INTO v_player_id
  FROM public.guests g
  WHERE g.club_id = p_club_id
    AND g.first_name_ci = v_first_ci
    AND g.last_name_ci  = v_last_ci;

  IF v_player_id IS NOT NULL THEN
    RETURN v_player_id;
  END IF;

  -- Not found: create a new guest player row.
  -- IMPORTANT: we only set columns that actually exist in your current schema.
  INSERT INTO public.players (
    user_id,
    first_name,
    last_name,
    gender,
    skill_rating,
    is_active,
    profile_completed,
    is_temporary,
    rating_history
  ) VALUES (
    NULL,
    p_first_name,
    p_last_name,
    'other',
    5,
    TRUE,
    FALSE,
    TRUE,
    '[]'::jsonb
  )
  RETURNING id INTO v_player_id;

  -- Create guests mapping for this club
  INSERT INTO public.guests (player_id, club_id, first_name_ci, last_name_ci)
  VALUES (v_player_id, p_club_id, v_first_ci, v_last_ci);

  RETURN v_player_id;

EXCEPTION
  WHEN unique_violation THEN
    -- Race-safe: another tx created the mapping first
    SELECT g.player_id
      INTO v_player_id
    FROM public.guests g
    WHERE g.club_id = p_club_id
      AND g.first_name_ci = v_first_ci
      AND g.last_name_ci  = v_last_ci;

    IF v_player_id IS NULL THEN
      RAISE;
    END IF;

    RETURN v_player_id;
END;
$$;


ALTER FUNCTION "public"."create_or_reuse_guest"("p_club_id" "uuid", "p_first_name" "text", "p_last_name" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "first_name" character varying(100) NOT NULL,
    "last_name" character varying(100) NOT NULL,
    "image_url" "text",
    "bio" "text",
    "skill_rating" integer,
    "is_active" boolean DEFAULT true NOT NULL,
    "gender" "text" DEFAULT 'other'::"text" NOT NULL,
    "birthday" "date",
    "club_id" "uuid",
    "height_cm" integer,
    "training_status" "text",
    "competition_level" "text",
    "game_performance" "text",
    "general_skill_level" "text",
    "profile_completed" boolean DEFAULT false,
    "is_temporary" boolean DEFAULT false,
    "rating_history" "jsonb" DEFAULT '[]'::"jsonb",
    "last_rating_update" timestamp with time zone,
    "total_matches_played" integer DEFAULT 0,
    "match_experience" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "first_name_ci" "text" GENERATED ALWAYS AS ("lower"("btrim"(("first_name")::"text"))) STORED,
    "last_name_ci" "text" GENERATED ALWAYS AS ("lower"("btrim"(("last_name")::"text"))) STORED,
    CONSTRAINT "players_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text", 'diverse'::"text"]))),
    CONSTRAINT "players_skill_rating_check" CHECK ((("skill_rating" >= 1) AND ("skill_rating" <= 100)))
);


ALTER TABLE "public"."players" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_or_reuse_guest"("p_club_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_skill_rating" integer DEFAULT 5, "p_gender" "text" DEFAULT 'other'::"text") RETURNS "public"."players"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_player   public.players%rowtype;
  v_first_ci text := lower(trim(p_first_name));
  v_last_ci  text := lower(trim(p_last_name));
begin
  -- 1) Try to find existing guest for (club, normalized name)
  select p.*
    into v_player
  from public.guests g
  join public.players p
    on p.id = g.player_id
  where g.club_id       = p_club_id
    and g.first_name_ci = v_first_ci
    and g.last_name_ci  = v_last_ci
  limit 1;

  if found then
    -- Bump last-used timestamp
    update public.guests
       set reused_at = now()
     where club_id       = p_club_id
       and first_name_ci = v_first_ci
       and last_name_ci  = v_last_ci;

    return v_player;
  end if;

  -- 2) No guest yet: create a temporary player
  insert into public.players (
    user_id,
    first_name,
    last_name,
    skill_rating,
    gender,
    is_temporary,
    is_active
  )
  values (
    null,
    p_first_name,
    p_last_name,
    coalesce(p_skill_rating, 5),
    coalesce(p_gender, 'other'),
    true,
    true
  )
  returning * into v_player;

  -- 3) Create the guests row with normalized name + timestamps
  insert into public.guests (
    player_id,
    club_id,
    first_name_ci,
    last_name_ci,
    created_at,
    reused_at
  )
  values (
    v_player.id,
    p_club_id,
    v_first_ci,
    v_last_ci,
    now(),
    now()
  );

  return v_player;
end;
$$;


ALTER FUNCTION "public"."create_or_reuse_guest"("p_club_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_skill_rating" integer, "p_gender" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_match_day_with_matches"("match_day_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- First delete all matches for this match day
  DELETE FROM matches WHERE matches.match_day_id = delete_match_day_with_matches.match_day_id;
  
  -- Then delete the match day
  DELETE FROM match_days WHERE id = delete_match_day_with_matches.match_day_id;
END;
$$;


ALTER FUNCTION "public"."delete_match_day_with_matches"("match_day_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."gp_set_snapshot_name"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_name text;
BEGIN
  -- Detect schema linkage dynamically: player_id -> players.id or user_id -> players.user_id
  IF NEW.snapshot_name IS NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='game_players' AND column_name='player_id'
    ) THEN
      SELECT trim(both from concat(coalesce(p.first_name,''),' ',coalesce(p.last_name,'')))
        INTO v_name
      FROM public.players p
      WHERE p.id = NEW.player_id;
    ELSIF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='game_players' AND column_name='user_id'
    ) THEN
      SELECT trim(both from concat(coalesce(p.first_name,''),' ',coalesce(p.last_name,'')))
        INTO v_name
      FROM public.players p
      WHERE p.user_id = NEW.user_id;
    ELSE
      v_name := NULL;
    END IF;

    NEW.snapshot_name := NULLIF(v_name, '');
  END IF;

  RETURN NEW;
END
$$;


ALTER FUNCTION "public"."gp_set_snapshot_name"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_email_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.user_profiles
  SET email = NEW.email
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_email_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_member"("club_uuid" "uuid", "user_uuid" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_members
    WHERE club_id = club_uuid
      AND user_id = user_uuid
      AND status  = 'active'
  );
$$;


ALTER FUNCTION "public"."is_active_member"("club_uuid" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_club_admin"("club_uuid" "uuid", "user_uuid" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_members
    WHERE club_id = club_uuid
      AND user_id = user_uuid
      AND status  = 'active'
      AND role    = 'admin'
  );
$$;


ALTER FUNCTION "public"."is_club_admin"("club_uuid" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_club_admin_or_editor"("club_uuid" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_members
    WHERE club_id = club_uuid
      AND user_id = user_uuid
      AND status  = 'active'
      AND role    IN ('admin','editor')
  );
$$;


ALTER FUNCTION "public"."is_club_admin_or_editor"("club_uuid" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_club_admin_safe"("club_uuid" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.club_members 
    WHERE club_id = club_uuid AND user_id = user_uuid AND role = 'admin'
  );
END;
$$;


ALTER FUNCTION "public"."is_club_admin_safe"("club_uuid" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_club_admin_secure"("club_uuid" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.club_members 
    WHERE club_id = club_uuid AND user_id = user_uuid AND role = 'admin'
  );
END;
$$;


ALTER FUNCTION "public"."is_club_admin_secure"("club_uuid" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_club_creator"("input_club_id" "uuid", "input_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clubs
    WHERE id = input_club_id AND created_by = input_user_id
  );
$$;


ALTER FUNCTION "public"."is_club_creator"("input_club_id" "uuid", "input_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_club_member"("club_uuid" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_members
    WHERE club_id = club_uuid
      AND user_id = user_uuid
      AND status  = 'active'
  );
$$;


ALTER FUNCTION "public"."is_club_member"("club_uuid" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."manage_members_list"("p_club_id" "uuid") RETURNS TABLE("membership_id" "uuid", "club_id" "uuid", "user_id" "uuid", "first_name" "text", "last_name" "text", "role" "text", "status" "public"."membership_status", "requested_at" timestamp with time zone, "activated_at" timestamp with time zone, "removed_at" timestamp with time zone, "rejected_at" timestamp with time zone, "member_association" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    cm.id                                as membership_id,
    cm.club_id,
    cm.user_id,
    (au.raw_user_meta_data->>'first_name')::text as first_name,
    (au.raw_user_meta_data->>'last_name')::text  as last_name,
    cm.role,
    cm.status,
    cm.requested_at,
    cm.activated_at,
    cm.removed_at,
    cm.rejected_at,
    cm.member_association                as member_association
  from public.club_members cm
  left join auth.users au on au.id = cm.user_id
  where cm.club_id = p_club_id
    and exists (
      select 1
      from public.club_members me
      where me.club_id = p_club_id
        and me.user_id = auth.uid()
        and me.status  = 'active'
    );
$$;


ALTER FUNCTION "public"."manage_members_list"("p_club_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_match_day_modified"("p_match_day_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_club_id uuid;
begin
  -- find the owning club
  select club_id into v_club_id
  from match_days
  where id = p_match_day_id;

  if v_club_id is null then
    raise exception 'match_day % not found', p_match_day_id using errcode = 'NO_DATA_FOUND';
  end if;

  -- ensure the caller is a member of that club
  if not is_club_member(v_club_id, auth.uid()) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  -- update only the audit columns
  update match_days
  set
    last_modified_by = auth.uid(),
    last_modified_at = now()
  where id = p_match_day_id;
end;
$$;


ALTER FUNCTION "public"."mark_match_day_modified"("p_match_day_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_removing_last_admin"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  active_admins integer;
BEGIN
  -- Only relevant if row is (or becomes) non-active admin
  IF (OLD.role = 'admin' AND OLD.status = 'active')
     AND (NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'active'
          OR NEW.role  IS DISTINCT FROM OLD.role  AND NEW.role  <> 'admin') THEN

    SELECT COUNT(*) INTO active_admins
    FROM public.club_members
    WHERE club_id = OLD.club_id
      AND status  = 'active'
      AND role    = 'admin';

    IF active_admins <= 1 THEN
      RAISE EXCEPTION 'Cannot remove or demote the last active admin of this club';
    END IF;
  END IF;

  RETURN NEW;
END$$;


ALTER FUNCTION "public"."prevent_removing_last_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_membership"("p_membership_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE v_club uuid;
BEGIN
  SELECT club_id INTO v_club FROM public.club_members WHERE id = p_membership_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.club_members me
    WHERE me.club_id = v_club AND me.user_id = auth.uid()
      AND me.role = 'admin' AND me.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.club_members
  SET status = 'rejected', rejected_at = now()
  WHERE id = p_membership_id;
END$$;


ALTER FUNCTION "public"."reject_membership"("p_membership_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_member"("p_membership_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE v_row public.club_members%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.club_members WHERE id = p_membership_id;

  IF NOT EXISTS (
    SELECT 1 FROM public.club_members me
    WHERE me.club_id = v_row.club_id AND me.user_id = auth.uid()
      AND me.role = 'admin' AND me.status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- Will be blocked by trigger if this is last admin
  UPDATE public.club_members
  SET status = 'removed', removed_at = now(), removed_by = auth.uid()
  WHERE id = p_membership_id;
END$$;


ALTER FUNCTION "public"."remove_member"("p_membership_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_club_membership"("p_slug" "text") RETURNS TABLE("club_id" "uuid", "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_club_id uuid;
  v_existing club_members%ROWTYPE;
BEGIN
  -- Normalize slug (your app seems to use uppercase in UI, store however you prefer)
  SELECT id
    INTO v_club_id
  FROM public.clubs
  WHERE slug = p_slug OR slug = lower(p_slug)
  LIMIT 1;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'club_not_found';
  END IF;

  -- If membership already exists, just return its current status
  SELECT *
    INTO v_existing
  FROM public.club_members
  WHERE club_id = v_club_id
    AND user_id = auth.uid()
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_club_id, v_existing.status::text;
    RETURN;
  END IF;

  -- Insert pending request
  INSERT INTO public.club_members (
    club_id, user_id, role, status, requested_at, is_active
  )
  VALUES (
    v_club_id, auth.uid(), 'member', 'pending', now(), false
  );

  RETURN QUERY SELECT v_club_id, 'pending'::text;
END;
$$;


ALTER FUNCTION "public"."request_club_membership"("p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_join_by_slug"("p_slug" "text", "p_member_association" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_club_id uuid;
begin
  -- Find active club by slug (case-insensitive, robust to user input)
  select id into v_club_id
  from public.clubs
  where status = 'active'
    and lower(slug) = lower(p_slug)
  limit 1;

  if v_club_id is null then
    raise exception 'club_not_found_or_deleted';
  end if;

  -- Insert membership request (pending)
  insert into public.club_members (
    club_id,
    user_id,
    role,
    status,
    is_active,
    requested_at,
    member_association
  )
  values (
    v_club_id,
    auth.uid(),
    'member',
    'pending',
    true,
    now(),
    coalesce(p_member_association, false)
  );

exception
  when unique_violation then
    -- Let frontend interpret this as "already requested / already member"
    raise;
end;
$$;


ALTER FUNCTION "public"."request_join_by_slug"("p_slug" "text", "p_member_association" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."request_membership"("p_club_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.club_members (
    id, club_id, user_id, role, status, requested_at, is_active
  )
  VALUES (
    gen_random_uuid(), p_club_id, auth.uid(), 'member', 'pending', now(), false
  )
  ON CONFLICT (club_id, user_id)
  DO UPDATE SET
    status       = 'pending',
    is_active    = false,
    requested_at = now(),
    rejected_at  = NULL,
    removed_at   = NULL,
    removed_by   = NULL
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."request_membership"("p_club_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_modified_at_on_clubs"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.modified_at := now();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_modified_at_on_clubs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_player_positions_replace"("p_player_id" "uuid", "p_primary_position_id" "uuid", "p_secondary_position_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  v_all_new uuid[];
begin
  if p_player_id is null then
    raise exception 'player_id must not be null';
  end if;
  if p_primary_position_id is null then
    raise exception 'primary_position_id must not be null';
  end if;

  -- Disallow duplicates in the secondaries list
  if p_secondary_position_ids is not null then
    perform 1
    from (
      select unnest(p_secondary_position_ids) as pid
    ) s
    group by pid
    having count(*) > 1;
    if found then
      raise exception 'secondary_position_ids must not contain duplicates';
    end if;
  end if;

  -- Primary must not be duplicated inside secondaries
  if p_secondary_position_ids is not null
     and p_primary_position_id = any(p_secondary_position_ids) then
    raise exception 'primary_position_id must not appear in secondary_position_ids';
  end if;

  -- Build the new final set = primary ∪ secondaries
  if p_secondary_position_ids is null then
    v_all_new := array[p_primary_position_id];
  else
    v_all_new := array_cat(array[p_primary_position_id], p_secondary_position_ids);
  end if;

  -- 1) Delete anything that is NOT in the new final set
  delete from player_positions
  where player_id = p_player_id
    and (position_id is null or position_id <> all(v_all_new));

  -- 2) Upsert the primary
  insert into player_positions (id, player_id, position_id, is_primary)
  values (gen_random_uuid(), p_player_id, p_primary_position_id, true)
  on conflict (player_id, position_id)
  do update set is_primary = excluded.is_primary;

  -- 3) Upsert all secondaries (if any)
  if p_secondary_position_ids is not null and array_length(p_secondary_position_ids, 1) > 0 then
    insert into player_positions (id, player_id, position_id, is_primary)
    select gen_random_uuid(), p_player_id, s.pid, false
    from unnest(p_secondary_position_ids) as s(pid)
    on conflict (player_id, position_id)
    do update set is_primary = excluded.is_primary;
  end if;

  -- 4) Safety: demote any accidental extra primaries (should be unnecessary due to logic above)
  update player_positions pp
  set is_primary = false
  where pp.player_id = p_player_id
    and pp.position_id <> p_primary_position_id
    and pp.is_primary is true;

end;
$$;


ALTER FUNCTION "public"."set_player_positions_replace"("p_player_id" "uuid", "p_primary_position_id" "uuid", "p_secondary_position_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_match_players_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_match_players_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_member_association"("p_membership_id" "uuid", "p_member_association" boolean) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  update public.club_members
  set member_association = coalesce(p_member_association, false)
  where id = p_membership_id;

  if not found then
    raise exception 'membership_not_found';
  end if;
end;
$$;


ALTER FUNCTION "public"."update_member_association"("p_membership_id" "uuid", "p_member_association" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_can_view_club_members"("p_club_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.club_members cm
    WHERE cm.club_id = p_club_id
      AND cm.user_id = auth.uid()
      AND cm.status  = 'active'
  );
$$;


ALTER FUNCTION "public"."user_can_view_club_members"("p_club_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."club_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "club_id" "uuid",
    "user_id" "uuid",
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "joined_at" timestamp without time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true NOT NULL,
    "removed_at" timestamp with time zone,
    "status" "public"."membership_status" DEFAULT 'pending'::"public"."membership_status" NOT NULL,
    "requested_at" timestamp with time zone,
    "activated_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "removed_by" "uuid",
    "member_association" boolean DEFAULT false NOT NULL,
    CONSTRAINT "club_members_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'editor'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."club_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clubs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "image_url" "text",
    "slug" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "status" "public"."club_status" DEFAULT 'active'::"public"."club_status" NOT NULL,
    "city" "text",
    "country" "text",
    "country_code" character(2),
    "is_club_discoverable" boolean DEFAULT false NOT NULL,
    "modified_at" timestamp with time zone,
    CONSTRAINT "clubs_country_code_alpha2_chk" CHECK ((("country_code" IS NULL) OR ("country_code" ~ '^[A-Z]{2}$'::"text")))
);


ALTER TABLE "public"."clubs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."game_players" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_day_id" "uuid" NOT NULL,
    "player_id" "uuid" NOT NULL,
    "team_name" character varying NOT NULL,
    "position_played" character varying,
    "original_team_name" character varying,
    "manually_adjusted" boolean DEFAULT false,
    "adjusted_by" "uuid",
    "adjusted_at" timestamp with time zone,
    "adjustment_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "snapshot_name" "text",
    "order_index" integer,
    CONSTRAINT "match_players_original_team_name_check" CHECK ((("original_team_name")::"text" = ANY ((ARRAY['team_a'::character varying, 'team_b'::character varying])::"text"[]))),
    CONSTRAINT "match_players_team_name_check" CHECK ((("team_name")::"text" = ANY ((ARRAY['team_a'::character varying, 'team_b'::character varying])::"text"[])))
);


ALTER TABLE "public"."game_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."guests" (
    "player_id" "uuid" NOT NULL,
    "club_id" "uuid" NOT NULL,
    "first_name_ci" "text" NOT NULL,
    "last_name_ci" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reused_at" timestamp with time zone
);


ALTER TABLE "public"."guests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "club_id" "uuid",
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."match_days" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "team_generated" boolean DEFAULT false,
    "notes" "text",
    "club_id" "uuid",
    "location_id" "uuid",
    "last_modified_by" "uuid",
    "last_modified_at" timestamp with time zone
);


ALTER TABLE "public"."match_days" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_day_id" "uuid" NOT NULL,
    "game_number" integer NOT NULL,
    "team_a_score" integer DEFAULT 0 NOT NULL,
    "team_b_score" integer DEFAULT 0 NOT NULL,
    "added_by_user_id" "uuid",
    CONSTRAINT "matches_game_number_check" CHECK ((("game_number" >= 1) AND ("game_number" <= 9)))
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."player_positions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "player_id" "uuid" NOT NULL,
    "position_id" "uuid" NOT NULL,
    "is_primary" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."player_positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."positions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(50) NOT NULL
);


ALTER TABLE "public"."positions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tmp_player_positions_backup" (
    "id" "uuid",
    "player_id" "uuid",
    "position_id" "uuid",
    "is_primary" boolean
);


ALTER TABLE "public"."tmp_player_positions_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tmp_players_backup" (
    "id" "uuid",
    "user_id" "uuid",
    "first_name" character varying(100),
    "last_name" character varying(100),
    "image_url" "text",
    "bio" "text",
    "skill_rating" integer,
    "is_active" boolean,
    "member_association" boolean,
    "gender" "text",
    "birthday" "date",
    "club_id" "uuid",
    "height_cm" integer,
    "training_status" "text",
    "competition_level" "text",
    "game_performance" "text",
    "general_skill_level" "text",
    "profile_completed" boolean,
    "is_temporary" boolean,
    "rating_history" "jsonb",
    "last_rating_update" timestamp with time zone,
    "total_matches_played" integer,
    "match_experience" "text",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone
);


ALTER TABLE "public"."tmp_players_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "email" "text",
    "theme" "text",
    "theme_updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_profiles_theme_check" CHECK (("theme" = ANY (ARRAY['light'::"text", 'dark'::"text"])))
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."club_members"
    ADD CONSTRAINT "club_members_club_id_user_id_key" UNIQUE ("club_id", "user_id");



ALTER TABLE ONLY "public"."club_members"
    ADD CONSTRAINT "club_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_slug_unique" UNIQUE ("slug");



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_pkey" PRIMARY KEY ("player_id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_club_id_name_key" UNIQUE ("club_id", "name");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."match_days"
    ADD CONSTRAINT "match_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."game_players"
    ADD CONSTRAINT "match_players_match_id_player_id_key" UNIQUE ("match_day_id", "player_id");



ALTER TABLE ONLY "public"."game_players"
    ADD CONSTRAINT "match_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_positions"
    ADD CONSTRAINT "player_positions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."positions"
    ADD CONSTRAINT "positions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "ux_guests_name_per_club" UNIQUE ("club_id", "first_name_ci", "last_name_ci");



CREATE INDEX "clubs_city_idx" ON "public"."clubs" USING "btree" ("lower"("city"));



CREATE INDEX "clubs_country_code_idx" ON "public"."clubs" USING "btree" ("country_code");



CREATE INDEX "clubs_discoverable_idx" ON "public"."clubs" USING "btree" ("is_club_discoverable");



CREATE INDEX "clubs_slug_idx" ON "public"."clubs" USING "btree" ("slug");



CREATE INDEX "clubs_status_idx" ON "public"."clubs" USING "btree" ("status");



CREATE UNIQUE INDEX "guests_unique_name_per_club" ON "public"."guests" USING "btree" ("club_id", "first_name_ci", "last_name_ci");



CREATE INDEX "idx_cm_club_status_role" ON "public"."club_members" USING "btree" ("club_id", "status", "role");



CREATE INDEX "idx_cm_club_user_status" ON "public"."club_members" USING "btree" ("club_id", "user_id", "status");



CREATE INDEX "idx_match_days_club_created" ON "public"."match_days" USING "btree" ("club_id", "created_at");



CREATE INDEX "ix_guests_club" ON "public"."guests" USING "btree" ("club_id");



CREATE UNIQUE INDEX "ux_clubs_slug_lower" ON "public"."clubs" USING "btree" ("lower"("slug"));



CREATE UNIQUE INDEX "ux_matches_matchday_gamenumber" ON "public"."matches" USING "btree" ("match_day_id", "game_number");



CREATE UNIQUE INDEX "ux_player_positions_unique" ON "public"."player_positions" USING "btree" ("player_id", "position_id");



CREATE UNIQUE INDEX "ux_player_primary_position_only_one" ON "public"."player_positions" USING "btree" ("player_id") WHERE ("is_primary" IS TRUE);



CREATE UNIQUE INDEX "ux_players_guest_name_per_club" ON "public"."players" USING "btree" ("club_id", "first_name_ci", "last_name_ci") WHERE ("user_id" IS NULL);



CREATE OR REPLACE TRIGGER "ensure_one_primary_position" BEFORE INSERT OR UPDATE ON "public"."player_positions" FOR EACH ROW EXECUTE FUNCTION "public"."check_one_primary_position"();



CREATE OR REPLACE TRIGGER "match_players_updated_at" BEFORE UPDATE ON "public"."game_players" FOR EACH ROW EXECUTE FUNCTION "public"."update_match_players_updated_at"();



CREATE OR REPLACE TRIGGER "trg_clubs_insert_creator_admin" AFTER INSERT ON "public"."clubs" FOR EACH ROW EXECUTE FUNCTION "public"."clubs_insert_creator_admin"();



CREATE OR REPLACE TRIGGER "trg_cm_normalize" BEFORE INSERT OR UPDATE ON "public"."club_members" FOR EACH ROW EXECUTE FUNCTION "public"."club_members_normalize"();



CREATE OR REPLACE TRIGGER "trg_gp_set_snapshot_name" BEFORE INSERT ON "public"."game_players" FOR EACH ROW EXECUTE FUNCTION "public"."gp_set_snapshot_name"();



CREATE OR REPLACE TRIGGER "trg_players_set_updated_at" BEFORE UPDATE ON "public"."players" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "trg_prevent_last_admin_removal" BEFORE UPDATE ON "public"."club_members" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_removing_last_admin"();



CREATE OR REPLACE TRIGGER "trg_set_modified_at_on_clubs" BEFORE UPDATE ON "public"."clubs" FOR EACH ROW EXECUTE FUNCTION "public"."set_modified_at_on_clubs"();



ALTER TABLE ONLY "public"."club_members"
    ADD CONSTRAINT "club_members_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."club_members"
    ADD CONSTRAINT "club_members_removed_by_fkey" FOREIGN KEY ("removed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."club_members"
    ADD CONSTRAINT "club_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."game_players"
    ADD CONSTRAINT "fk_game_players_match_day" FOREIGN KEY ("match_day_id") REFERENCES "public"."match_days"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."guests"
    ADD CONSTRAINT "guests_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."match_days"
    ADD CONSTRAINT "match_days_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."match_days"
    ADD CONSTRAINT "match_days_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."match_days"
    ADD CONSTRAINT "match_days_last_teams_changed_by_fkey" FOREIGN KEY ("last_modified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."match_days"
    ADD CONSTRAINT "match_days_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."game_players"
    ADD CONSTRAINT "match_players_adjusted_by_fkey" FOREIGN KEY ("adjusted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."game_players"
    ADD CONSTRAINT "match_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_added_by_user_id_fkey" FOREIGN KEY ("added_by_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_match_day_id_fkey" FOREIGN KEY ("match_day_id") REFERENCES "public"."match_days"("id");



ALTER TABLE ONLY "public"."player_positions"
    ADD CONSTRAINT "player_positions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id");



ALTER TABLE ONLY "public"."player_positions"
    ADD CONSTRAINT "player_positions_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins manage memberships in their club" ON "public"."club_members" FOR UPDATE USING ("public"."is_club_admin"("club_id", "auth"."uid"())) WITH CHECK ("public"."is_club_admin"("club_id", "auth"."uid"()));



CREATE POLICY "Admins view members in their club" ON "public"."club_members" FOR SELECT USING ("public"."is_club_admin"("club_id", "auth"."uid"()));



CREATE POLICY "Anyone can insert match scores" ON "public"."matches" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Anyone can view positions" ON "public"."positions" FOR SELECT USING (true);



CREATE POLICY "Club admins and editors can create match days" ON "public"."match_days" FOR INSERT WITH CHECK ("public"."is_club_admin_or_editor"("club_id", "auth"."uid"()));



CREATE POLICY "Club admins and editors can update match days" ON "public"."match_days" FOR UPDATE USING ("public"."is_club_admin_or_editor"("club_id", "auth"."uid"())) WITH CHECK ("public"."is_club_admin_or_editor"("club_id", "auth"."uid"()));



CREATE POLICY "Club admins can delete match days" ON "public"."match_days" FOR DELETE USING ("public"."is_club_admin"("club_id", "auth"."uid"()));



CREATE POLICY "Club admins can delete matches" ON "public"."matches" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."match_days" "md"
  WHERE (("md"."id" = "matches"."match_day_id") AND "public"."is_club_admin"("md"."club_id", "auth"."uid"())))));



CREATE POLICY "Club creator can insert admin membership" ON "public"."club_members" FOR INSERT WITH CHECK ((("role" = 'admin'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."clubs"
  WHERE (("clubs"."id" = "club_members"."club_id") AND ("clubs"."created_by" = "auth"."uid"()))))));



CREATE POLICY "Club members can create match days for their clubs" ON "public"."match_days" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."club_members" "cm"
  WHERE (("cm"."club_id" = "match_days"."club_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."is_active" = true)))));



CREATE POLICY "Club members can update match days (basic)" ON "public"."match_days" FOR UPDATE USING ("public"."is_club_member"("club_id", "auth"."uid"())) WITH CHECK ("public"."is_club_member"("club_id", "auth"."uid"()));



CREATE POLICY "Club members can update matches" ON "public"."matches" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."match_days" "md"
  WHERE (("md"."id" = "matches"."match_day_id") AND "public"."is_club_member"("md"."club_id", "auth"."uid"())))));



CREATE POLICY "Club members can view matches" ON "public"."matches" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."match_days" "md"
  WHERE (("md"."id" = "matches"."match_day_id") AND "public"."is_club_member"("md"."club_id", "auth"."uid"())))));



CREATE POLICY "Creator or admin may update club" ON "public"."clubs" FOR UPDATE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_club_admin"("id", "auth"."uid"()))) WITH CHECK (((("created_by" = "auth"."uid"()) OR "public"."is_club_admin"("id", "auth"."uid"())) AND ("status" = ANY (ARRAY['active'::"public"."club_status", 'deleted'::"public"."club_status"]))));



CREATE POLICY "Members see active peers in their club" ON "public"."club_members" FOR SELECT USING ((("status" = 'active'::"public"."membership_status") AND "public"."is_club_member"("club_id", "auth"."uid"())));



CREATE POLICY "Players visible to club members" ON "public"."players" FOR SELECT USING ("public"."is_club_member"("club_id", "auth"."uid"()));



CREATE POLICY "Users can create clubs" ON "public"."clubs" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can create locations for their clubs" ON "public"."locations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."club_members"
  WHERE (("club_members"."club_id" = "locations"."club_id") AND ("club_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create player profiles" ON "public"."players" FOR INSERT WITH CHECK (((("user_id" IS NOT NULL) AND ("auth"."uid"() = "user_id")) OR (("user_id" IS NULL) AND ("is_temporary" = true) AND (EXISTS ( SELECT 1
   FROM "public"."club_members" "cm"
  WHERE (("cm"."user_id" = "auth"."uid"()) AND ("cm"."status" = 'active'::"public"."membership_status")))))));



CREATE POLICY "Users can deactivate own membership" ON "public"."club_members" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete game_players in their clubs" ON "public"."game_players" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."match_days" "md"
  WHERE (("md"."id" = "game_players"."match_day_id") AND "public"."is_club_member"("md"."club_id", "auth"."uid"())))));



CREATE POLICY "Users can delete locations from their clubs" ON "public"."locations" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."club_members"
  WHERE (("club_members"."club_id" = "locations"."club_id") AND ("club_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own positions" ON "public"."player_positions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."players"
  WHERE (("players"."id" = "player_positions"."player_id") AND ("players"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert game_players in their clubs" ON "public"."game_players" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."match_days" "md"
  WHERE (("md"."id" = "game_players"."match_day_id") AND "public"."is_club_member"("md"."club_id", "auth"."uid"())))));



CREATE POLICY "Users can manage their own player positions" ON "public"."player_positions" USING ((EXISTS ( SELECT 1
   FROM "public"."players"
  WHERE (("players"."id" = "player_positions"."player_id") AND ("players"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their own positions" ON "public"."player_positions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."players"
  WHERE (("players"."id" = "player_positions"."player_id") AND ("players"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update game_players in their clubs" ON "public"."game_players" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."match_days" "md"
  WHERE (("md"."id" = "game_players"."match_day_id") AND "public"."is_club_member"("md"."club_id", "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."match_days" "md"
  WHERE (("md"."id" = "game_players"."match_day_id") AND "public"."is_club_member"("md"."club_id", "auth"."uid"())))));



CREATE POLICY "Users can update locations from their clubs" ON "public"."locations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."club_members"
  WHERE (("club_members"."club_id" = "locations"."club_id") AND ("club_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own profile" ON "public"."user_profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own player profile" ON "public"."players" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own positions" ON "public"."player_positions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."players"
  WHERE (("players"."id" = "player_positions"."player_id") AND ("players"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view all player positions" ON "public"."player_positions" FOR SELECT USING (true);



CREATE POLICY "Users can view game_players in their clubs" ON "public"."game_players" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."match_days" "md"
  WHERE (("md"."id" = "game_players"."match_day_id") AND "public"."is_club_member"("md"."club_id", "auth"."uid"())))));



CREATE POLICY "Users can view locations from their clubs" ON "public"."locations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."club_members"
  WHERE (("club_members"."club_id" = "locations"."club_id") AND ("club_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view match days for their clubs" ON "public"."match_days" FOR SELECT USING ("public"."is_club_member"("club_id", "auth"."uid"()));



CREATE POLICY "Users can view own profile" ON "public"."user_profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view players in same clubs" ON "public"."players" FOR SELECT USING (((("user_id" IS NOT NULL) AND (("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM ("public"."club_members" "cm_self"
     JOIN "public"."club_members" "cm_other" ON (("cm_self"."club_id" = "cm_other"."club_id")))
  WHERE (("cm_self"."user_id" = "auth"."uid"()) AND ("cm_other"."user_id" = "players"."user_id") AND ("cm_self"."status" = 'active'::"public"."membership_status") AND ("cm_other"."status" = 'active'::"public"."membership_status")))))) OR (("user_id" IS NULL) AND ("is_temporary" = true) AND (EXISTS ( SELECT 1
   FROM "public"."club_members" "cm"
  WHERE (("cm"."user_id" = "auth"."uid"()) AND ("cm"."status" = 'active'::"public"."membership_status")))))));



CREATE POLICY "Users can view their own player row" ON "public"."players" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users request to join as member (pending)" ON "public"."club_members" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("role" = 'member'::"text")));



CREATE POLICY "Users view own membership rows" ON "public"."club_members" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."club_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clubs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clubs_insert_by_creator" ON "public"."clubs" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "clubs_select_active_by_creator_or_member" ON "public"."clubs" FOR SELECT TO "authenticated" USING ((("status" = 'active'::"public"."club_status") AND (("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."club_members" "cm"
  WHERE (("cm"."club_id" = "clubs"."id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."status" = 'active'::"public"."membership_status")))))));



CREATE POLICY "clubs_select_deleted_by_creator_or_admin" ON "public"."clubs" FOR SELECT TO "authenticated" USING ((("status" = 'deleted'::"public"."club_status") AND (("created_by" = "auth"."uid"()) OR "public"."is_club_admin"("id", "auth"."uid"()))));



CREATE POLICY "clubs_update_by_creator_or_admin" ON "public"."clubs" FOR UPDATE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_club_admin"("id", "auth"."uid"()))) WITH CHECK (((("created_by" = "auth"."uid"()) OR "public"."is_club_admin"("id", "auth"."uid"())) AND ("status" = ANY (ARRAY['active'::"public"."club_status", 'deleted'::"public"."club_status"]))));



CREATE POLICY "creator_or_admin_can_view_deleted_club" ON "public"."clubs" FOR SELECT TO "authenticated" USING ((("status" = 'deleted'::"public"."club_status") AND (("created_by" = "auth"."uid"()) OR "public"."is_club_admin"("id", "auth"."uid"()))));



CREATE POLICY "creators_or_members_can_select_clubs" ON "public"."clubs" FOR SELECT TO "authenticated" USING ((("status" = 'active'::"public"."club_status") AND (("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."club_members" "cm"
  WHERE (("cm"."club_id" = "clubs"."id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."status" = 'active'::"public"."membership_status")))))));



ALTER TABLE "public"."game_players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."match_days" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "matches_delete_by_club_members" ON "public"."matches" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."match_days" "md"
     JOIN "public"."club_members" "cm" ON ((("cm"."club_id" = "md"."club_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."status" = 'active'::"public"."membership_status"))))
  WHERE ("md"."id" = "matches"."match_day_id"))));



CREATE POLICY "matches_insert_by_club_members" ON "public"."matches" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."match_days" "md"
     JOIN "public"."club_members" "cm" ON ((("cm"."club_id" = "md"."club_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."status" = 'active'::"public"."membership_status"))))
  WHERE ("md"."id" = "matches"."match_day_id"))));



ALTER TABLE "public"."player_positions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."players" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."positions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profile_self_select" ON "public"."user_profiles" FOR SELECT USING (("id" = "auth"."uid"()));



CREATE POLICY "profile_self_update" ON "public"."user_profiles" FOR UPDATE USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."club_members";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."game_players";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."match_days";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."matches";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";











































































































































































GRANT ALL ON FUNCTION "public"."approve_membership"("p_membership_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_membership"("p_membership_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_membership"("p_membership_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_view_profile"("viewed_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_view_profile"("viewed_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_profile"("viewed_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."change_member_role"("p_membership_id" "uuid", "p_new_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."change_member_role"("p_membership_id" "uuid", "p_new_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."change_member_role"("p_membership_id" "uuid", "p_new_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_is_club_member"("club_uuid" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_is_club_member"("club_uuid" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_is_club_member"("club_uuid" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_one_primary_position"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_one_primary_position"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_one_primary_position"() TO "service_role";



GRANT ALL ON FUNCTION "public"."club_has_members"("club_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."club_has_members"("club_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."club_has_members"("club_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."club_members_normalize"() TO "anon";
GRANT ALL ON FUNCTION "public"."club_members_normalize"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."club_members_normalize"() TO "service_role";



GRANT ALL ON FUNCTION "public"."clubs_insert_creator_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."clubs_insert_creator_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."clubs_insert_creator_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_or_reuse_guest"("p_club_id" "uuid", "p_first_name" "text", "p_last_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_or_reuse_guest"("p_club_id" "uuid", "p_first_name" "text", "p_last_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_or_reuse_guest"("p_club_id" "uuid", "p_first_name" "text", "p_last_name" "text") TO "service_role";



GRANT ALL ON TABLE "public"."players" TO "anon";
GRANT ALL ON TABLE "public"."players" TO "authenticated";
GRANT ALL ON TABLE "public"."players" TO "service_role";



GRANT ALL ON FUNCTION "public"."create_or_reuse_guest"("p_club_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_skill_rating" integer, "p_gender" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_or_reuse_guest"("p_club_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_skill_rating" integer, "p_gender" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_or_reuse_guest"("p_club_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_skill_rating" integer, "p_gender" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_match_day_with_matches"("match_day_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_match_day_with_matches"("match_day_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_match_day_with_matches"("match_day_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."gp_set_snapshot_name"() TO "anon";
GRANT ALL ON FUNCTION "public"."gp_set_snapshot_name"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."gp_set_snapshot_name"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_email_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_email_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_email_update"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_active_member"("club_uuid" "uuid", "user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_active_member"("club_uuid" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_active_member"("club_uuid" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_member"("club_uuid" "uuid", "user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_club_admin"("club_uuid" "uuid", "user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_club_admin"("club_uuid" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_club_admin"("club_uuid" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_club_admin"("club_uuid" "uuid", "user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_club_admin_or_editor"("club_uuid" "uuid", "user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_club_admin_or_editor"("club_uuid" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_club_admin_or_editor"("club_uuid" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_club_admin_or_editor"("club_uuid" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_club_admin_safe"("club_uuid" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_club_admin_safe"("club_uuid" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_club_admin_safe"("club_uuid" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_club_admin_secure"("club_uuid" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_club_admin_secure"("club_uuid" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_club_admin_secure"("club_uuid" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_club_creator"("input_club_id" "uuid", "input_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_club_creator"("input_club_id" "uuid", "input_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_club_creator"("input_club_id" "uuid", "input_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_club_member"("club_uuid" "uuid", "user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_club_member"("club_uuid" "uuid", "user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_club_member"("club_uuid" "uuid", "user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_club_member"("club_uuid" "uuid", "user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."manage_members_list"("p_club_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."manage_members_list"("p_club_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."manage_members_list"("p_club_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_match_day_modified"("p_match_day_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_match_day_modified"("p_match_day_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_match_day_modified"("p_match_day_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_match_day_modified"("p_match_day_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_removing_last_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_removing_last_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_removing_last_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_membership"("p_membership_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_membership"("p_membership_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_membership"("p_membership_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_member"("p_membership_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_member"("p_membership_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_member"("p_membership_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."request_club_membership"("p_slug" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_club_membership"("p_slug" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."request_club_membership"("p_slug" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_club_membership"("p_slug" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."request_join_by_slug"("p_slug" "text", "p_member_association" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."request_join_by_slug"("p_slug" "text", "p_member_association" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_join_by_slug"("p_slug" "text", "p_member_association" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."request_membership"("p_club_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."request_membership"("p_club_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_membership"("p_club_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_modified_at_on_clubs"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_modified_at_on_clubs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_modified_at_on_clubs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_player_positions_replace"("p_player_id" "uuid", "p_primary_position_id" "uuid", "p_secondary_position_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."set_player_positions_replace"("p_player_id" "uuid", "p_primary_position_id" "uuid", "p_secondary_position_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_player_positions_replace"("p_player_id" "uuid", "p_primary_position_id" "uuid", "p_secondary_position_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_match_players_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_match_players_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_match_players_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_member_association"("p_membership_id" "uuid", "p_member_association" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_member_association"("p_membership_id" "uuid", "p_member_association" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_member_association"("p_membership_id" "uuid", "p_member_association" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."user_can_view_club_members"("p_club_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_can_view_club_members"("p_club_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_can_view_club_members"("p_club_id" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."club_members" TO "anon";
GRANT ALL ON TABLE "public"."club_members" TO "authenticated";
GRANT ALL ON TABLE "public"."club_members" TO "service_role";



GRANT ALL ON TABLE "public"."clubs" TO "anon";
GRANT ALL ON TABLE "public"."clubs" TO "authenticated";
GRANT ALL ON TABLE "public"."clubs" TO "service_role";



GRANT ALL ON TABLE "public"."game_players" TO "anon";
GRANT ALL ON TABLE "public"."game_players" TO "authenticated";
GRANT ALL ON TABLE "public"."game_players" TO "service_role";



GRANT ALL ON TABLE "public"."guests" TO "anon";
GRANT ALL ON TABLE "public"."guests" TO "authenticated";
GRANT ALL ON TABLE "public"."guests" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."match_days" TO "anon";
GRANT ALL ON TABLE "public"."match_days" TO "authenticated";
GRANT ALL ON TABLE "public"."match_days" TO "service_role";



GRANT ALL ON TABLE "public"."matches" TO "anon";
GRANT ALL ON TABLE "public"."matches" TO "authenticated";
GRANT ALL ON TABLE "public"."matches" TO "service_role";



GRANT ALL ON TABLE "public"."player_positions" TO "anon";
GRANT ALL ON TABLE "public"."player_positions" TO "authenticated";
GRANT ALL ON TABLE "public"."player_positions" TO "service_role";



GRANT ALL ON TABLE "public"."positions" TO "anon";
GRANT ALL ON TABLE "public"."positions" TO "authenticated";
GRANT ALL ON TABLE "public"."positions" TO "service_role";



GRANT ALL ON TABLE "public"."tmp_player_positions_backup" TO "anon";
GRANT ALL ON TABLE "public"."tmp_player_positions_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."tmp_player_positions_backup" TO "service_role";



GRANT ALL ON TABLE "public"."tmp_players_backup" TO "anon";
GRANT ALL ON TABLE "public"."tmp_players_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."tmp_players_backup" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























