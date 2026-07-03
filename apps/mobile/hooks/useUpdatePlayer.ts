import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSupabaseClient,
  updatePlayer,
  updatePlayerPositions,
} from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";

/**
 * Prefix for invalidating every ["player-profile", ...] query.
 * NOTE: not in constants/queryKeys (frozen for this work package) —
 * matches queryKeys.profile.player(userId) = ["player-profile", userId].
 */
const PLAYER_PROFILE_PREFIX = ["player-profile"] as const;

export type UpdatePlayerInput = {
  playerId: string;
  data: {
    first_name: string;
    last_name: string;
    bio?: string | null;
    image_url?: string | null;
    gender?: "male" | "female" | "other" | "diverse";
    birthday?: string | null;
    /** Not covered by core updatePlayer — written directly. */
    height_cm?: number | null;
    /** Not covered by core updatePlayer — written directly. */
    city?: string | null;
  };
  /** When set, player_positions are replaced via core updatePlayerPositions. */
  primaryPositionId: string | null;
  secondaryPositionIds: string[];
};

/**
 * Saves profile edits: core updatePlayer for the fields it supports,
 * a direct players update for height_cm / city (missing from core
 * PlayerData), and core updatePlayerPositions for positions.
 * Invalidates queryKeys.profile.* on success.
 */
export function useUpdatePlayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      playerId,
      data,
      primaryPositionId,
      secondaryPositionIds,
    }: UpdatePlayerInput) => {
      // Nulls must pass through so cleared fields (bio, image, birthday)
      // are actually cleared in the DB — supabase-js drops `undefined`
      // keys from the update payload (web Profile.tsx writes nulls too).
      // Core PlayerData types these as optional string, hence the cast.
      await updatePlayer(playerId, {
        first_name: data.first_name,
        last_name: data.last_name,
        bio: data.bio ?? null,
        image_url: data.image_url ?? null,
        gender: data.gender,
        birthday: data.birthday ?? null,
      } as unknown as Parameters<typeof updatePlayer>[1]);

      // height_cm and city are not part of core PlayerData; update directly
      // (mirrors apps/web Profile.tsx which writes them in the same update).
      if (data.height_cm !== undefined || data.city !== undefined) {
        const supabase = getSupabaseClient();
        const patch: { height_cm?: number | null; city?: string | null } = {};
        if (data.height_cm !== undefined) patch.height_cm = data.height_cm;
        if (data.city !== undefined) patch.city = data.city;
        const { error } = await supabase
          .from("players")
          .update(patch)
          .eq("id", playerId);
        if (error) throw error;
      }

      if (primaryPositionId) {
        await updatePlayerPositions(
          playerId,
          primaryPositionId,
          secondaryPositionIds
        );
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: PLAYER_PROFILE_PREFIX });
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile.stats(variables.playerId),
      });
    },
  });
}
