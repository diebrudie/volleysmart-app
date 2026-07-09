import { useQuery } from "@tanstack/react-query";
import { fetchMatchDayBundle, type MatchDayBundle } from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useClubRole, type ClubRole } from "./useClubRole";

export type UseGameResult = ReturnType<typeof useGame>;

/**
 * Load a match-day bundle (match_day + sets + roster) plus the current user's
 * role in the game's club.
 *
 * Mirrors the web Game.tsx gating: score/team editing is allowed for club
 * admins and editors (`isAdminOrEditor`). Screens should HIDE admin-only
 * actions for non-admins (not just disable), matching web.
 */
export function useGame(matchDayId: string) {
  const query = useQuery<MatchDayBundle>({
    queryKey: queryKeys.games.detail(matchDayId),
    queryFn: () => fetchMatchDayBundle(matchDayId),
    enabled: !!matchDayId,
  });

  // Role resolves against the loaded bundle's club (null while loading).
  const roleQuery = useClubRole(query.data?.club_id ?? undefined);
  const role: ClubRole = roleQuery.data ?? "none";
  const isAdmin = role === "admin";
  const isAdminOrEditor = role === "admin" || role === "editor";
  const isMember = role !== "none";

  return {
    ...query,
    /** The game bundle (undefined until loaded). */
    bundle: query.data,
    role,
    isAdmin,
    isAdminOrEditor,
    isMember,
    /** True once the club-role query has settled (avoid flashing admin UI). */
    roleReady: !query.data || roleQuery.isSuccess || roleQuery.isError,
  };
}
