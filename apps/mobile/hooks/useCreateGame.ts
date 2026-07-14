import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  assignTeams,
  createMatchDay,
  createOrReuseGuestByName,
  getLastPositionForPlayerInClub,
  normalizeRole,
  type NewGamePlayer,
  type PlayerForTeams,
} from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useAuth } from "./useAuth";
import { invalidateGameFanout } from "./useGameMutations";

/** A selected club member to place on a team. Mirrors NewGame's ClubMember. */
export type CreateGameMember = {
  /** players.id */
  playerId: string;
  skillRating: number;
  /** Raw primary position name (e.g. "Outside Hitter"); normalized here. */
  primaryPositionName: string | null;
  /** Raw secondary position names; normalized here. */
  secondaryPositionNames?: string[];
  gender?: string | null;
  firstName?: string | null;
};

/** A selected guest ("extra player"). Mirrors NewGame's ExtraPlayer. */
export type CreateGameGuest = {
  /** First name (spaces stripped) used to create/reuse the guest. */
  name: string;
  /** When set, reuse this existing guest player.id instead of creating one. */
  existingPlayerId?: string | null;
  skillRating: number;
  /** Fallback position when the guest has no last-played position in the club. */
  position: string;
};

export type CreateGamePayload = {
  clubId: string;
  /** Date object or "yyyy-MM-dd" string. */
  date: Date | string;
  locationId?: string | null;
  /** Set when the game is started from a planned event. */
  plannedEventId?: string | null;
  isOpponentMode?: boolean;
  opponentTeamName?: string | null;
  members: CreateGameMember[];
  guests?: CreateGameGuest[];
};

function toDateString(d: Date | string): string {
  if (typeof d === "string") return d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Create-game flow: resolve guests, run the shared team-balancing algorithm,
 * then persist a new match day. Mirrors web NewGame.tsx handleSubmit
 * (guest reuse -> PlayerForTeams -> assignTeams -> match_day + 5 sets + roster).
 *
 * Returns the created match_day id so the screen can navigate to `/games/[id]`.
 */
export function useCreateGame() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateGamePayload): Promise<{ id: string }> => {
      if (!user?.id) throw new Error("Not authenticated");
      const { clubId, members, guests = [] } = payload;
      if (!clubId) throw new Error("Missing club");

      // 1. Resolve every guest to a players.id (reuse existing or create by
      //    name), then reuse its last position in this club when available.
      //    Each guest is independent — resolve in parallel (mirrors NewGame).
      const resolvedGuests = await Promise.all(
        guests.map(async (guest) => {
          let guestPlayerId: string;
          if (guest.existingPlayerId) {
            guestPlayerId = guest.existingPlayerId;
          } else {
            const firstName = guest.name.trim().replace(/\s+/g, "") || "Guest";
            const guestPlayer = await createOrReuseGuestByName(
              clubId,
              firstName,
              "Player"
            );
            guestPlayerId = guestPlayer.id;
          }
          const lastPos = await getLastPositionForPlayerInClub(
            clubId,
            guestPlayerId
          );
          return {
            playerId: guestPlayerId,
            skillRating: guest.skillRating,
            position: lastPos ?? guest.position,
            name: guest.name,
          };
        })
      );

      // 2. Build PlayerForTeams input (members + resolved guests).
      const playersForTeams: PlayerForTeams[] = [
        ...members.map((m) => ({
          id: m.playerId,
          score: m.skillRating ?? 50,
          mainPosition: normalizeRole(m.primaryPositionName),
          secondaryPositions: (m.secondaryPositionNames ?? []).map(normalizeRole),
          gender: m.gender ?? null,
          name: m.firstName ?? null,
        })),
        ...resolvedGuests.map((g) => ({
          id: g.playerId,
          score: g.skillRating,
          mainPosition: normalizeRole(g.position),
          secondaryPositions: [],
          name: g.name ?? null,
        })),
      ];

      // 3. Balance teams (shared algorithm) and map to the roster insert shape.
      const assignment = assignTeams(playersForTeams);
      const gamePlayers: NewGamePlayer[] = [
        ...assignment.teamA,
        ...assignment.teamB,
      ].map((ap) => ({
        player_id: ap.id,
        team_name: ap.team,
        position_played: ap.assignedPosition,
      }));

      // 4. Persist the match day + 5 base sets + roster.
      const md = await createMatchDay({
        clubId,
        date: toDateString(payload.date),
        createdBy: user.id,
        locationId: payload.locationId ?? null,
        plannedEventId: payload.plannedEventId ?? null,
        isOpponentMode: payload.isOpponentMode,
        opponentTeamName: payload.opponentTeamName ?? null,
        gamePlayers,
      });

      return { id: md.id };
    },
    onSuccess: (result, payload) => {
      invalidateGameFanout(queryClient, {
        matchDayId: result.id,
        clubId: payload.clubId,
        eventId: payload.plannedEventId ?? null,
        userId: user?.id,
      });
      // Refresh the source event's "view game" link.
      if (payload.plannedEventId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.events.matchDay(payload.plannedEventId),
        });
      }
    },
  });
}
