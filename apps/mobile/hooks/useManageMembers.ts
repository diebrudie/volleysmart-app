import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveMembership,
  getSupabaseClient,
  listManageMembers,
  rejectMembership,
  type ManageMemberRow,
} from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";

/**
 * Pending join requests for one club (admin only — the underlying
 * `manage_members_list` RPC enforces admin access).
 * Mirrors apps/web/src/pages/ManageMembers.tsx (listManageMembers + pending filter).
 */
export function usePendingRequests(clubId: string | undefined) {
  return useQuery<ManageMemberRow[]>({
    queryKey: queryKeys.members.manage(clubId),
    enabled: !!clubId,
    queryFn: async () => {
      const rows = await listManageMembers(clubId!);
      return rows
        .filter((r) => r.status === "pending")
        .sort((a, b) => {
          const aTime = a.requested_at ? new Date(a.requested_at).getTime() : 0;
          const bTime = b.requested_at ? new Date(b.requested_at).getTime() : 0;
          return bTime - aTime;
        });
    },
  });
}

/** Total pending join-request count for a set of admin clubs (red-dot badge). */
export function usePendingRequestsTotal(clubIds: string[]) {
  return useQuery<number>({
    queryKey: [...queryKeys.members.pendingCountPrefix, ...clubIds],
    enabled: clubIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { count, error } = await supabase
        .from("club_members")
        .select("id", { count: "exact", head: true })
        .in("club_id", clubIds)
        .eq("status", "pending");
      if (error) throw error;
      return count ?? 0;
    },
  });
}

type MutationContext = { previous: ManageMemberRow[] | undefined };

function useRequestDecision(
  clubId: string | undefined,
  decide: (membershipId: string) => Promise<void>
) {
  const queryClient = useQueryClient();
  const listKey = queryKeys.members.manage(clubId);

  return useMutation<void, Error, string, MutationContext>({
    mutationFn: (membershipId) => decide(membershipId),
    // Optimistic: drop the row from the pending list immediately.
    onMutate: async (membershipId) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<ManageMemberRow[]>(listKey);
      queryClient.setQueryData<ManageMemberRow[]>(listKey, (rows) =>
        (rows ?? []).filter((r) => r.membership_id !== membershipId)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: listKey }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.clubs.members(clubId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.clubs.memberCount(clubId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.members.pendingCountPrefix,
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.members.allGlobal }),
      ]);
    },
  });
}

/** Approve a pending join request (optimistic removal + rollback). */
export function useApproveRequest(clubId: string | undefined) {
  return useRequestDecision(clubId, approveMembership);
}

/** Reject a pending join request (optimistic removal + rollback). */
export function useRejectRequest(clubId: string | undefined) {
  return useRequestDecision(clubId, rejectMembership);
}
