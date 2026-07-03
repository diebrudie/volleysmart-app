import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptInvitation,
  generateInvitation,
  getSupabaseClient,
  revokeInvitation,
  validateInvitationToken,
  type AcceptInvitationResult,
  type GeneratedInvitation,
  type InvitationValidation,
} from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useAuth } from "./useAuth";

export const INVITE_BASE_URL = "https://volleysmart.app/invite";

export function buildInviteLink(token: string) {
  return `${INVITE_BASE_URL}/${token}`;
}

/**
 * Fetch-or-create the club invite link (admin only).
 * Mirrors web ClubInviteSharePanel `generate_invitation` usage — the RPC
 * returns the existing active invitation when one exists.
 */
export function useClubInvitation(clubId: string | undefined) {
  return useQuery<GeneratedInvitation>({
    queryKey: queryKeys.members.invites(clubId),
    enabled: !!clubId,
    queryFn: () => generateInvitation(clubId!),
  });
}

/**
 * Revoke the current invitation and mint a new one.
 * Mirrors web ClubInviteSharePanel handleRegenerate.
 */
export function useRegenerateInvitation(clubId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation<GeneratedInvitation, Error, string>({
    // arg = the invitation_id to revoke
    mutationFn: async (currentInvitationId) => {
      await revokeInvitation(currentInvitationId);
      return generateInvitation(clubId!);
    },
    onSuccess: (fresh) => {
      queryClient.setQueryData(queryKeys.members.invites(clubId), fresh);
    },
  });
}

/** Validate an invite token (works for anon + authenticated users). */
export function useInviteValidation(token: string | undefined) {
  const { loading: authLoading } = useAuth();

  return useQuery<InvitationValidation>({
    queryKey: queryKeys.members.inviteValidation(token),
    enabled: !!token && !authLoading,
    queryFn: () => validateInvitationToken(token!),
  });
}

/**
 * Accept an invite token. On a fresh join request the `notify-join-request`
 * edge function is invoked fire-and-forget, exactly like web InvitePage.
 * Errors whose message contains "invitation_invalid" mean the link is
 * expired/revoked — callers show the dedicated message for those.
 */
export function useAcceptInvitation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<AcceptInvitationResult, Error, string>({
    mutationFn: (token) => acceptInvitation(token),
    onSuccess: async (result, token) => {
      if (
        result.result_status !== "already_member" &&
        result.result_status !== "already_pending"
      ) {
        // Fresh join request → notify club admins (same as web InvitePage).
        getSupabaseClient()
          .functions.invoke("notify-join-request", { body: { token } })
          .catch(() => {});
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.clubs.mine(user?.id),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.members.inviteValidation(token),
        }),
      ]);
    },
  });
}
