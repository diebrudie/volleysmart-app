import { useMutation } from "@tanstack/react-query";
import { getSupabaseClient, requestJoinClub } from "@volleysmart/core";

export type JoinRequestResult =
  | "pending_approval"
  | "already_member"
  | "already_pending";

/**
 * Request to join a discoverable club (request_join_club RPC).
 * On a fresh pending request it best-effort invokes the
 * notify-join-request edge function, mirroring apps/web ClubOverview.tsx.
 */
export function useJoinClub(clubId: string | undefined) {
  return useMutation<JoinRequestResult, Error, void>({
    mutationFn: async () => {
      const result = await requestJoinClub(clubId!);
      if (result === "pending_approval") {
        try {
          const supabase = getSupabaseClient();
          void supabase.functions
            .invoke("notify-join-request", { body: { club_id: clubId } })
            .catch(() => {});
        } catch {
          // best-effort notification only
        }
      }
      return result;
    },
  });
}
