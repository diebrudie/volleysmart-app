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
