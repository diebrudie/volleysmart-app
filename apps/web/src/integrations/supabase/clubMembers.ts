/**
 * Club members: re-exports data layer from @volleysmart/core,
 * plus React Query hooks that remain web-only.
 */
import { useQuery } from "@tanstack/react-query";
import {
  fetchMembership,
  fetchUserRole,
  fetchMemberCount,
  fetchPendingRequestCount,
} from "@volleysmart/core";
import type { ClubMemberStatus, ClubMemberRole } from "@volleysmart/core";

// Re-export data layer from core
export {
  fetchMembership,
  fetchUserRole,
  fetchMemberCount,
  fetchMemberRowBasic,
  fetchActiveMemberClubsWithDetails,
  fetchPendingMembershipRequests,
  fetchUserClubIds,
  fetchPendingRequestCount,
  fetchActiveMembersBasic,
  deactivateMembersByUserIds,
  leaveClub,
  removeClubMembers,
  requestJoinClub,
} from "@volleysmart/core";
export type {
  ClubMemberRole,
  ClubMemberStatus,
  MemberClubWithDetails,
  PendingClubRequest,
  ClubMemberBasic,
} from "@volleysmart/core";

// ── React Query hooks (web-only) ──────────────────────────────────

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
    staleTime: 5 * 60 * 1000,
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

/** Hook: pending request count */
export function usePendingRequestCount(
  clubId: string | null,
  opts?: { enabled?: boolean }
) {
  const enabled = (opts?.enabled ?? true) && Boolean(clubId);
  return useQuery({
    queryKey: ["pendingRequestsCount", clubId],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      return clubId ? fetchPendingRequestCount(clubId) : 0;
    },
  });
}
