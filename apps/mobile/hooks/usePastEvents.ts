import { useQuery } from "@tanstack/react-query";
import { fetchPastEvents, type PastEventRow } from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useAuth } from "./useAuth";

/**
 * Past events (with match scores) for the signed-in user.
 * Pass `enabled: false` to defer fetching until the Past tab is opened
 * (mirrors the web UpcomingEvents page behavior).
 */
export function usePastEvents(options?: { enabled?: boolean }) {
  const { user } = useAuth();
  const enabled = options?.enabled ?? true;
  return useQuery<PastEventRow[]>({
    queryKey: queryKeys.events.past(user?.id),
    queryFn: () => fetchPastEvents(user!.id),
    enabled: !!user?.id && enabled,
    retry: 1,
  });
}
