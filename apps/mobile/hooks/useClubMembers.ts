import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSupabaseClient, removeClubMembers } from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";

export type ClubMemberWithPlayer = {
  user_id: string;
  role: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  primary_position: string | null;
  member_association: boolean;
  is_coach: boolean;
};

type PlayerPositionRow = {
  is_primary: boolean | null;
  positions: { name: string | null } | null;
};

type PlayerRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  player_positions: PlayerPositionRow[] | null;
};

/**
 * Active members of a club with player profile, primary position,
 * association + coach badges. Mirrors apps/web ClubOverview.tsx
 * "club-members-list" (two queries: no FK club_members -> players).
 */
export function useClubMembers(clubId: string | undefined) {
  return useQuery<ClubMemberWithPlayer[]>({
    queryKey: queryKeys.clubs.members(clubId),
    enabled: !!clubId,
    queryFn: async () => {
      const supabase = getSupabaseClient();

      const { data: rows, error } = await supabase
        .from("club_members")
        .select("user_id, role, member_association, is_coach")
        .eq("club_id", clubId!)
        .eq("is_active", true)
        .eq("status", "active")
        .order("role");
      if (error) throw error;
      const memberRows = (rows ?? []).filter(
        (r): r is typeof r & { user_id: string } => !!r.user_id
      );
      if (!memberRows.length) return [];

      const userIds = memberRows.map((r) => r.user_id);
      const { data: players, error: pErr } = await supabase
        .from("players")
        .select(
          "user_id, first_name, last_name, image_url, player_positions(is_primary, positions(name))"
        )
        .in("user_id", userIds);
      if (pErr) throw pErr;

      const playerMap = new Map(
        ((players ?? []) as unknown as PlayerRow[]).map((p) => [p.user_id, p])
      );

      const merged: ClubMemberWithPlayer[] = memberRows.map((m) => {
        const p = playerMap.get(m.user_id);
        const primaryPos = (p?.player_positions ?? []).find(
          (pp) => pp.is_primary
        );
        return {
          user_id: m.user_id,
          role: (m.role as string | null) ?? null,
          first_name: p?.first_name ?? null,
          last_name: p?.last_name ?? null,
          image_url: p?.image_url ?? null,
          primary_position: primaryPos?.positions?.name ?? null,
          member_association: Boolean(m.member_association),
          is_coach: Boolean(m.is_coach),
        };
      });
      merged.sort((a, b) =>
        (a.first_name ?? "").localeCompare(b.first_name ?? "")
      );
      return merged;
    },
  });
}

/**
 * Admin: toggle the coach badge on a club member.
 * Mirrors apps/web ClubOverview.tsx toggleCoachMutation
 * (direct club_members.is_coach update — no core wrapper exists).
 */
export function useToggleCoach(clubId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      isCoach,
    }: {
      userId: string;
      isCoach: boolean;
    }) => {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("club_members")
        .update({ is_coach: isCoach })
        .eq("club_id", clubId!)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.clubs.members(clubId),
      });
    },
  });
}

/**
 * Admin: remove members (multi-select) via the remove_club_members RPC.
 */
export function useRemoveMembers(clubId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userIds: string[]) => {
      await removeClubMembers(clubId!, userIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.clubs.members(clubId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.clubs.memberCount(clubId),
      });
    },
  });
}
