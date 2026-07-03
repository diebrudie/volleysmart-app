import { useQuery } from "@tanstack/react-query";
import {
  getSupabaseClient,
  getClubMemberCount,
  fetchPendingMembershipRequests,
  type PendingClubRequest,
} from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useAuth } from "./useAuth";
import { usePlayerProfile } from "./usePlayerProfile";
import { useUserClubs } from "./useUserClubs";

/**
 * Local key: pending club membership requests are not in the (frozen)
 * constants/queryKeys registry. Reported to the gate agent for promotion.
 */
export const pendingClubRequestsKey = (userId: string | undefined) =>
  ["pending-club-requests", userId] as const;

/** Prefix for invalidating all discover-clubs queries (registry only has the parameterized form). */
export const discoverClubsPrefix = ["discover-clubs"] as const;

export type DiscoverClub = {
  id: string;
  name: string;
  image_url: string | null;
  city: string | null;
  created_at: string;
  memberCount: number;
};

/** Clubs where the current user has a pending join request. */
export function usePendingClubRequests() {
  const { user } = useAuth();
  return useQuery<PendingClubRequest[]>({
    queryKey: pendingClubRequestsKey(user?.id),
    queryFn: () => fetchPendingMembershipRequests(user!.id),
    enabled: !!user?.id,
  });
}

/**
 * Discoverable public clubs the user is not already in (and has no pending
 * request for), filtered by the player's home city when set.
 * Mirrors apps/web/src/pages/Clubs.tsx `discoverableClubs`.
 */
export function useDiscoverClubs() {
  const { user } = useAuth();
  const { data: profile } = usePlayerProfile();
  const { data: userClubs, isSuccess: clubsLoaded } = useUserClubs();
  const { data: pendingRequests, isSuccess: pendingLoaded } =
    usePendingClubRequests();

  const playerCity =
    (profile as { city?: string | null } | null | undefined)?.city ?? undefined;

  const excludeIds = [
    ...(userClubs ?? []).map((c) => c.club_id),
    ...(pendingRequests ?? []).map((r) => r.club_id),
  ];

  return useQuery<DiscoverClub[]>({
    queryKey: [
      ...queryKeys.clubs.discover(playerCity),
      user?.id,
      excludeIds.join(","),
    ],
    enabled: !!user?.id && clubsLoaded && pendingLoaded,
    queryFn: async () => {
      const supabase = getSupabaseClient();
      let query = supabase
        .from("clubs")
        .select("id, name, image_url, city, created_at")
        .eq("is_club_discoverable", true)
        .eq("status", "active")
        .limit(20);
      if (playerCity) {
        query = query.eq("city", playerCity);
      }
      const { data, error } = await query;
      if (error) throw error;

      const exclude = new Set(excludeIds);
      const filtered = (data ?? []).filter((c) => !exclude.has(c.id));

      // Member counts via SECURITY DEFINER RPC (bypasses club_members RLS),
      // fetched in parallel like the web page.
      const withCounts = await Promise.all(
        filtered.map(async (c) => ({
          ...c,
          memberCount: await getClubMemberCount(c.id).catch(() => 0),
        }))
      );
      return withCounts;
    },
  });
}
