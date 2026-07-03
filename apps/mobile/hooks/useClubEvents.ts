import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient, type PlannedEvent } from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";

export function useClubEvents(clubId: string) {
  return useQuery<PlannedEvent[]>({
    queryKey: queryKeys.clubs.events(clubId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("planned_events")
        .select(
          `*, clubs!planned_events_club_id_fkey(id, name, image_url, is_club_discoverable), locations!planned_events_location_id_fkey(name, address), event_rsvp(status, player_id)`
        )
        .eq("club_id", clubId)
        .in("status", ["open", "confirmed"])
        .gte("date", today)
        .order("date")
        .limit(10);

      if (error) throw error;
      return (data ?? []) as PlannedEvent[];
    },
    enabled: !!clubId,
  });
}
