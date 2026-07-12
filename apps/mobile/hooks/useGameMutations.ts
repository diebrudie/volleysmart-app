import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import {
  addSet,
  createSameTeams,
  deleteMatchDay,
  deleteSet,
  updateGamePlayers,
  updateMatchDayLocation,
  updateSetScore,
  type GamePlayerAssignment,
  type UpdateGamePlayersOptions,
} from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useAuth } from "./useAuth";

/** Everything a game mutation needs to know to fan out its invalidations. */
export type GameFanoutContext = {
  matchDayId?: string;
  clubId?: string | null;
  /** Linked planned event, if the game was started from one. */
  eventId?: string | null;
  /** Signed-in user id, for the home-dashboard key. */
  userId?: string;
};

/**
 * Cross-cutting cache invalidation after any game write ("fan-out" per the
 * mobile game-layer plan). Mobile dashboard cards and stats read the
 * match_days / matches / game_players tables directly, so a score/team change
 * must refresh all of them:
 *   - games.detail(matchDayId)      the game screen itself
 *   - home.allLastGame              LastGameCard
 *   - home.allMonthlyStats          month stats tiles
 *   - home.dashboard(userId)        home dashboard
 *   - profile.allStats              profile analytics tab
 *   - clubs.stats(clubId)           club overview stats (when clubbed)
 *   - events.matchDay(eventId)      event detail "view game" link (when linked)
 */
export function invalidateGameFanout(
  queryClient: QueryClient,
  ctx: GameFanoutContext
) {
  if (ctx.matchDayId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.games.detail(ctx.matchDayId),
    });
  }
  queryClient.invalidateQueries({ queryKey: queryKeys.home.allLastGame });
  queryClient.invalidateQueries({ queryKey: queryKeys.home.allMonthlyStats });
  queryClient.invalidateQueries({ queryKey: queryKeys.home.allDashboard });
  queryClient.invalidateQueries({ queryKey: queryKeys.profile.allStats });
  if (ctx.clubId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.clubs.stats(ctx.clubId),
    });
  }
  if (ctx.eventId) {
    queryClient.invalidateQueries({
      queryKey: queryKeys.events.matchDay(ctx.eventId),
    });
  }
}

/**
 * All write operations for a single match day. Pass the game's `clubId` and
 * linked `eventId` (read off the bundle) so each mutation can fan out its
 * invalidations correctly.
 */
export function useGameMutations(
  matchDayId: string,
  ctx?: { clubId?: string | null; eventId?: string | null }
) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fanoutCtx: GameFanoutContext = {
    matchDayId,
    clubId: ctx?.clubId ?? null,
    eventId: ctx?.eventId ?? null,
    userId: user?.id,
  };

  /** Update the score of a single set (one `matches` row). */
  const setScore = useMutation({
    mutationFn: ({
      matchId,
      teamAScore,
      teamBScore,
    }: {
      matchId: string;
      teamAScore: number;
      teamBScore: number;
    }) => updateSetScore(matchId, teamAScore, teamBScore),
    onSuccess: () => invalidateGameFanout(queryClient, fanoutCtx),
  });

  /** Append an extra set (game_number beyond the 5 base sets). */
  const addExtraSet = useMutation({
    mutationFn: ({ gameNumber }: { gameNumber: number }) =>
      addSet(matchDayId, gameNumber),
    onSuccess: () => invalidateGameFanout(queryClient, fanoutCtx),
  });

  /** Delete an extra set (core no-ops on the 5 base sets). */
  const removeSet = useMutation({
    mutationFn: ({ matchId }: { matchId: string }) => deleteSet(matchId),
    onSuccess: () => invalidateGameFanout(queryClient, fanoutCtx),
  });

  /** Delete the whole match day. Caller navigates away on success. */
  const removeMatchDay = useMutation({
    mutationFn: () => deleteMatchDay(matchDayId),
    onSuccess: () => {
      invalidateGameFanout(queryClient, fanoutCtx);
      queryClient.removeQueries({
        queryKey: queryKeys.games.detail(matchDayId),
      });
    },
  });

  /**
   * Create a fresh game (today) reusing this game's teams. Returns the new
   * match_day so the screen can navigate to it.
   */
  const sameTeams = useMutation({
    mutationFn: () => {
      if (!user?.id) throw new Error("Not authenticated");
      return createSameTeams(matchDayId, user.id);
    },
    onSuccess: (md) => {
      // Fan out for the source game, then also seed the new game's detail cache.
      invalidateGameFanout(queryClient, fanoutCtx);
      invalidateGameFanout(queryClient, {
        matchDayId: md.id,
        clubId: md.club_id,
        userId: user?.id,
      });
    },
  });

  /** Update the match day's saved location (Edit Location sheet). */
  const updateLocation = useMutation({
    mutationFn: ({ locationId }: { locationId: string }) =>
      updateMatchDayLocation(matchDayId, locationId),
    onSuccess: () => invalidateGameFanout(queryClient, fanoutCtx),
  });

  /** Persist a manual team edit (tap-to-move). */
  const saveTeams = useMutation({
    mutationFn: ({
      assignments,
      opts,
    }: {
      assignments: GamePlayerAssignment[];
      opts?: UpdateGamePlayersOptions;
    }) => updateGamePlayers(matchDayId, assignments, opts),
    onSuccess: () => invalidateGameFanout(queryClient, fanoutCtx),
  });

  return {
    setScore,
    addExtraSet,
    removeSet,
    removeMatchDay,
    sameTeams,
    saveTeams,
    updateLocation,
  };
}
