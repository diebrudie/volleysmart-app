import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertRsvp, deleteRsvp, type RsvpStatus } from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";

export function useRsvpMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      playerId,
      status,
    }: {
      eventId: string;
      playerId: string;
      status: RsvpStatus | null;
    }) => {
      if (status === null) {
        await deleteRsvp(eventId, playerId);
      } else {
        await upsertRsvp(eventId, playerId, status);
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.events.allUpcoming });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.detail(variables.eventId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.attendees(variables.eventId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.allEvents });
    },
  });
}
