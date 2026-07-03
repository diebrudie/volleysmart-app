import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEventTemplate,
  deleteEventTemplate,
  fetchEventTemplates,
  type CreateTemplateInput,
  type EventTemplate,
} from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useAuth } from "./useAuth";

/**
 * The registry key factory is queryKeys.events.templates(id). Templates are
 * fetched per-user (RLS-scoped), so we key by userId here — the factory
 * parameter name says clubId but the value is just a cache discriminator.
 */
export function useEventTemplates() {
  const { user } = useAuth();
  return useQuery<EventTemplate[]>({
    queryKey: queryKeys.events.templates(user?.id),
    queryFn: () => fetchEventTemplates(user!.id),
    enabled: !!user?.id,
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function useCreateEventTemplate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTemplateInput) =>
      createEventTemplate(user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.templates(user?.id),
      });
    },
  });
}

export function useDeleteEventTemplate() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) => deleteEventTemplate(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.events.templates(user?.id),
      });
    },
  });
}
