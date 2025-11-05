/**
 * Helpers and React Query hooks for club_members access.
 * Centralizes: query keys, enabled guards, staleTime, and safe selects.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ClubMemberRole = "admin" | "editor" | "member" | null;
export type ClubMemberStatus =
  | "active"
  | "pending"
  | "removed"
  | "rejected"
  | null;

export async function fetchMembership(
  userId: string,
  clubId: string
): Promise<{ status: ClubMemberStatus; is_active: boolean } | null> {
  const { data, error } = await supabase
    .from("club_members")
    .select("status,is_active")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function fetchUserRole(
  userId: string,
  clubId: string
): Promise<ClubMemberRole> {
  const { data, error } = await supabase
    .from("club_members")
    .select("role")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();
  if (error) throw error;
  return (data?.role as ClubMemberRole) ?? null;
}

export async function fetchMemberCount(clubId: string): Promise<number> {
  const { count, error } = await supabase
    .from("club_members")
    .select("*", { count: "exact", head: true })
    .eq("club_id", clubId);
  if (error) throw error;
  return count ?? 0;
}

/** Hook: membership row (status + is_active) */
export function useMembership(
  userId: string | null,
  clubId: string | null,
  opts?: { enabled?: boolean }
) {
  const enabled = (opts?.enabled ?? true) && Boolean(userId && clubId);
  return useQuery({
    queryKey: ["club_membership", { userId, clubId }],
    enabled,
    staleTime: 5 * 60 * 1000, // 5 min
    queryFn: async () => {
      return userId && clubId ? fetchMembership(userId, clubId) : null;
    },
  });
}

/** Hook: user role in a club */
export function useUserRole(
  userId: string | null,
  clubId: string | null,
  opts?: { enabled?: boolean }
) {
  const enabled = (opts?.enabled ?? true) && Boolean(userId && clubId);
  return useQuery({
    queryKey: ["club_user_role", { userId, clubId }],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      return userId && clubId ? fetchUserRole(userId, clubId) : null;
    },
  });
}

/** Hook: count members */
export function useMemberCount(
  clubId: string | null,
  opts?: { enabled?: boolean }
) {
  const enabled = (opts?.enabled ?? true) && Boolean(clubId);
  return useQuery({
    queryKey: ["club_member_count", { clubId }],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      return clubId ? fetchMemberCount(clubId) : 0;
    },
  });
}

export async function fetchMemberRowBasic(
  userId: string,
  clubId: string
): Promise<{ id: string; role: ClubMemberRole } | null> {
  const { data, error } = await supabase
    .from("club_members")
    .select("id, role")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) throw error;
  return data
    ? { id: String(data.id), role: (data.role as ClubMemberRole) ?? null }
    : null;
}

/**
 * Fetch active club memberships for a user, with joined club details.
 * Mirrors the SELECT in Clubs.tsx but centralizes it here.
 */
export type MemberClubWithDetails = {
  club_id: string;
  role: ClubMemberRole | string; // PostgREST returns string, we narrow upstream
  status: ClubMemberStatus | string | null;
  is_active: boolean;
  clubs: {
    id: string;
    name: string;
    image_url: string | null;
    created_at: string;
    created_by: string;
    description?: string | null;
    slug: string;
    status: string | null;
    city?: string | null;
    country?: string | null;
    country_code?: string | null;
    is_club_discoverable?: boolean | null;
  } | null;
};

export async function fetchActiveMemberClubsWithDetails(
  userId: string
): Promise<MemberClubWithDetails[]> {
  const { data, error } = await supabase
    .from("club_members")
    .select(
      `
      club_id,
      role,
      status,
      is_active,
      clubs!inner (
        id,
        name,
        image_url,
        created_at,
        created_by,
        description,
        slug,
        status,
        city,
        country,
        country_code,
        is_club_discoverable
      )
    `
    )
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("is_active", true)
    .eq("clubs.status", "active");

  if (error) throw error;
  return (data ?? []) as MemberClubWithDetails[];
}

/**
 * Lightweight list of club IDs the user belongs to (no extra filters to preserve current behavior).
 */
export async function fetchUserClubIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []).map((r) => String(r.club_id));
}
