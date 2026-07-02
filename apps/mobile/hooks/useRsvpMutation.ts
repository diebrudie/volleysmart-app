import { useMutation, useQueryClient } from "@tanstack/react-query";
import { upsertRsvp, deleteRsvp, type RsvpStatus } from "@volleysmart/core";

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
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
      queryClient.invalidateQueries({
        queryKey: ["event-detail", variables.eventId],
      });
      queryClient.invalidateQueries({ queryKey: ["club-events"] });
    },
  });
}
