import { useQuery } from "@tanstack/react-query";
import {
  fetchActiveMembersBasic,
  getSupabaseClient,
} from "@volleysmart/core";

export type ClubMemberWithPlayer = {
  user_id: string;
  role: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
};

export function useClubMembers(clubId: string) {
  return useQuery<ClubMemberWithPlayer[]>({
    queryKey: ["club-members", clubId],
    queryFn: async () => {
      const members = await fetchActiveMembersBasic(clubId);
      const userIds = members.map((m) => m.user_id);
      if (userIds.length === 0) return [];

      const supabase = getSupabaseClient();
      const { data: players } = await supabase
        .from("players")
        .select("user_id, first_name, last_name, image_url")
        .in("user_id", userIds);

      const playerMap = new Map(
        (players ?? []).map((p) => [p.user_id, p])
      );

      return members.map((m) => {
        const player = playerMap.get(m.user_id);
        return {
          user_id: m.user_id,
          role: m.role as string | null,
          first_name: player?.first_name ?? null,
          last_name: player?.last_name ?? null,
          image_url: player?.image_url ?? null,
        };
      });
    },
    enabled: !!clubId,
  });
}
