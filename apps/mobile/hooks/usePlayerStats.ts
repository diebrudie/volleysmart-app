import { useQuery } from "@tanstack/react-query";
import { fetchPlayerStats, type PlayerStats } from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useCurrentPlayerId } from "./useCurrentPlayerId";

/**
 * All-time personal analytics for the signed-in player.
 * Mirrors apps/web Profile.tsx ["player-stats", playerId, club, year]
 * with the web defaults (all clubs, all years).
 */
export function usePlayerStats() {
  const { data: playerId } = useCurrentPlayerId();

  return useQuery<PlayerStats>({
    queryKey: queryKeys.profile.stats(playerId ?? undefined),
    enabled: !!playerId,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchPlayerStats(playerId!),
  });
}
