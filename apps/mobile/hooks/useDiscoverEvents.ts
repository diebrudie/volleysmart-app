/**
 * Discover events — public events near the player's home city, excluding
 * events from clubs the user is already a member of.
 * Port of the discover logic in apps/web/src/pages/DiscoverEvents.tsx and
 * the "Discover Events" section of apps/web/src/pages/HomeDashboard.tsx.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchPublicEvents,
  fetchUserClubIds,
  type PlannedEvent,
} from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useAuth } from "./useAuth";
import { usePlayerProfile } from "./usePlayerProfile";

/**
 * Local query-key prefix (missing from the frozen constants/queryKeys.ts
 * registry — flagged for the integration pass). Matches the web key.
 */
export const USER_CLUB_IDS_KEY = "user-club-ids";

export function useDiscoverEvents(limit?: number) {
  const { user } = useAuth();
  const { data: player, isLoading: playerLoading } = usePlayerProfile();
  const city: string | undefined = player?.city || undefined;

  const { data: userClubIds = [] } = useQuery({
    queryKey: [USER_CLUB_IDS_KEY, user?.id],
    queryFn: () => fetchUserClubIds(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: publicEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: queryKeys.events.discover(city),
    queryFn: () => fetchPublicEvents(city),
    enabled: !!user?.id && !playerLoading,
    staleTime: 5 * 60 * 1000,
  });

  const events: PlannedEvent[] = useMemo(() => {
    const clubIdSet = new Set(userClubIds);
    const filtered = publicEvents.filter(
      (e) => !e.club_id || !clubIdSet.has(e.club_id)
    );
    return typeof limit === "number" ? filtered.slice(0, limit) : filtered;
  }, [publicEvents, userClubIds, limit]);

  return {
    events,
    city,
    isLoading: playerLoading || eventsLoading,
  };
}
