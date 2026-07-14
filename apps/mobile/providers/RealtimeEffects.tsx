/**
 * RealtimeEffects — mounted once in the authenticated tree (app/_layout.tsx).
 *
 * Renders null; all work happens in useRealtimeInvalidation:
 * Supabase Realtime channels (memberships, club game tables, notifications)
 * plus an AppState foreground refetch, all funnelled into react-query
 * invalidation. See hooks/useRealtimeInvalidation.ts.
 */
import { useRealtimeInvalidation } from "@/hooks/useRealtimeInvalidation";

export function RealtimeEffects() {
  useRealtimeInvalidation();
  return null;
}
