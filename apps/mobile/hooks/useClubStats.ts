import { useQuery } from "@tanstack/react-query";
import { fetchClubStats, type ClubStats } from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";

/**
 * Club-level analytics for a given year.
 * Mirrors apps/web ClubOverview.tsx ["club-stats", clubId, year].
 * Key extends queryKeys.clubs.stats(clubId) so prefix invalidation
 * still matches every year variant.
 */
export function useClubStats(
  clubId: string | undefined,
  year: number,
  enabled = true
) {
  return useQuery<ClubStats>({
    queryKey: [...queryKeys.clubs.stats(clubId), year],
    enabled: !!clubId && enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchClubStats(clubId!, year),
  });
}
