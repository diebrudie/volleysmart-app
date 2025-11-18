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

/**
 * Count pending membership requests for a club.
 */
export async function fetchPendingRequestCount(
  clubId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("club_members")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId)
    .eq("status", "pending");

  if (error) throw error;
  return count ?? 0;
}

/**
 * React Query hook for pending count (optional: pass { enabled } to gate)
 */
export function usePendingRequestCount(
  clubId: string | null,
  opts?: { enabled?: boolean }
) {
  const enabled = (opts?.enabled ?? true) && Boolean(clubId);
  return useQuery({
    queryKey: ["pendingRequestsCount", clubId],
    enabled,
    staleTime: 60_000, // 1 min is plenty here
    queryFn: async () => {
      return clubId ? fetchPendingRequestCount(clubId) : 0;
    },
  });
}

/**
 * Minimal member row used by Members page to then fetch player data.
 */
export type ClubMemberBasic = {
  club_id: string;
  id: string;
  joined_at: string;
  user_id: string;
  is_active: boolean;
  role: ClubMemberRole | string | null;
  member_association: boolean | null;
};

/**
 * Fetch active members for a club (basic fields only).
 */
export async function fetchActiveMembersBasic(
  clubId: string
): Promise<ClubMemberBasic[]> {
  const { data, error } = await supabase
    .from("club_members")
    .select(
      "club_id, id, joined_at, user_id, is_active, role, member_association"
    )
    .eq("club_id", clubId)
    .eq("is_active", true);

  if (error) throw error;
  return (data ?? []) as ClubMemberBasic[];
}

/**
 * Deactivate multiple members by user_id for a club.
 * Uses returning minimal semantics (no implicit SELECT).
 */
export async function deactivateMembersByUserIds(
  clubId: string,
  userIds: string[]
): Promise<void> {
  if (!userIds.length) return;
  const { error } = await supabase
    .from("club_members")
    .update({ is_active: false })
    .in("user_id", userIds)
    .eq("club_id", clubId);

  if (error) throw error;
}
