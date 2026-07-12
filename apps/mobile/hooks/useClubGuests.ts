import { useQuery } from "@tanstack/react-query";
import { getGuestsForClub } from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";

/**
 * A club's existing guest ("temporary"/extra) players — the ones created via
 * the guest flow (a players row backed by a `guests` row, no linked user
 * account). Used by the New Game screen to let the user reuse a previously
 * created guest instead of always typing a new name (R6-4, web parity with
 * NewGame's GuestNameSelector).
 *
 * Data source: core `getGuestsForClub(clubId)` (the same core function the web
 * autocomplete uses) — no raw Supabase query in the component.
 */
export type ClubGuest = {
  /** players.id — pass this as CreateGameGuest.existingPlayerId to reuse it. */
  id: string;
  /** First name shown in the picker (spaces already stripped upstream). */
  name: string;
};

export function useClubGuests(clubId: string | null | undefined) {
  return useQuery<ClubGuest[]>({
    queryKey: queryKeys.clubs.guests(clubId ?? undefined),
    enabled: !!clubId,
    queryFn: async () => {
      const rows = await getGuestsForClub(clubId!);
      return rows.map((g) => ({
        id: g.player_id,
        name: g.first_name,
      }));
    },
  });
}
