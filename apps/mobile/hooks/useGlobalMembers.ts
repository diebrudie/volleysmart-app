import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useAuth } from "./useAuth";

/**
 * Aggregated member across all of the current user's clubs.
 * Mirrors apps/web/src/pages/MembersGlobal.tsx fetchGlobalMembers.
 */
export type GlobalMember = {
  player_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  image_url: string | null;
  skill_rating: number | null;
  member_association: boolean | null;
  player_positions: Array<{
    is_primary: boolean | null;
    positions: { name: string };
  }>;
  clubs: Array<{ id: string; name: string; slug: string; role: string }>;
};

async function fetchGlobalMembers(userId: string): Promise<GlobalMember[]> {
  const supabase = getSupabaseClient();

  const { data: myMemberships, error: myErr } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("status", "active");

  if (myErr) throw myErr;
  if (!myMemberships?.length) return [];

  const clubIds = myMemberships
    .map((m) => m.club_id)
    .filter(Boolean) as string[];

  const { data: clubRows } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .in("id", clubIds)
    .eq("status", "active");

  const clubById: Record<string, { name: string; slug: string }> = {};
  (clubRows ?? []).forEach((c) => {
    clubById[c.id] = { name: c.name, slug: c.slug };
  });

  const activeClubIds = clubIds.filter((id) => id in clubById);

  const byPlayerId = new Map<string, GlobalMember>();

  await Promise.all(
    activeClubIds.map(async (clubId) => {
      const { data: members } = await supabase
        .from("club_members")
        .select("user_id, role, member_association")
        .eq("club_id", clubId)
        .eq("is_active", true)
        .eq("status", "active");

      if (!members?.length) return;

      const userIds = members
        .map((m) => m.user_id)
        .filter(Boolean) as string[];
      if (!userIds.length) return;

      const { data: players } = await supabase
        .from("players")
        .select(
          `id, user_id, first_name, last_name, image_url, skill_rating,
           player_positions(id, position_id, is_primary, positions(id, name))`
        )
        .in("user_id", userIds);

      const playerByUserId = new Map(
        (players ?? []).map((p) => [p.user_id, p])
      );

      for (const row of members) {
        if (!row.user_id) continue;
        const p = playerByUserId.get(row.user_id);
        if (!p) continue;

        const club = clubById[clubId];
        const clubEntry = {
          id: clubId,
          name: club?.name ?? "",
          slug: club?.slug ?? "",
          role: row.role ?? "member",
        };

        const existing = byPlayerId.get(p.id);
        if (existing) {
          if (!existing.clubs.some((c) => c.id === clubEntry.id)) {
            existing.clubs.push(clubEntry);
          }
        } else {
          byPlayerId.set(p.id, {
            player_id: p.id,
            user_id: p.user_id,
            first_name: p.first_name,
            last_name: p.last_name,
            image_url: p.image_url,
            skill_rating: p.skill_rating,
            member_association: row.member_association ?? null,
            player_positions: (p.player_positions ??
              []) as GlobalMember["player_positions"],
            clubs: [clubEntry],
          });
        }
      }
    })
  );

  return Array.from(byPlayerId.values());
}

/** All members across the current user's active clubs, deduped by player. */
export function useGlobalMembers() {
  const { user } = useAuth();

  return useQuery<GlobalMember[]>({
    queryKey: queryKeys.members.global(user?.id),
    queryFn: () => fetchGlobalMembers(user!.id),
    enabled: !!user?.id,
    retry: 1,
  });
}

/**
 * Clubs (of the members result) where the CURRENT user is admin.
 * Mirrors the adminClubs memo in web MembersGlobal.
 */
export function useAdminClubs() {
  const { user } = useAuth();
  const query = useGlobalMembers();

  const adminClubs = useMemo(() => {
    if (!user?.id || !query.data) return [];
    const me = query.data.find((m) => m.user_id === user.id);
    if (!me) return [];
    return me.clubs.filter((c) => c.role === "admin");
  }, [query.data, user?.id]);

  return { adminClubs, isLoading: query.isLoading };
}
