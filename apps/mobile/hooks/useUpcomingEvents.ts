import { useQuery } from "@tanstack/react-query";
import { fetchUpcomingEvents, type PlannedEvent } from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useAuth } from "./useAuth";

export function useUpcomingEvents() {
  const { user } = useAuth();
  return useQuery<PlannedEvent[]>({
    queryKey: queryKeys.events.upcoming(user?.id),
    queryFn: () => fetchUpcomingEvents(user!.id),
    enabled: !!user?.id,
    retry: 1,
  });
}
