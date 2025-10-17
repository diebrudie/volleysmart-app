/**
 * match_days helpers: mark page/team modifications.
 * Uses a narrow 'any' cast to tolerate missing columns in stale generated types.

 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
type MatchDaysUpdate = Database["public"]["Tables"]["match_days"]["Update"];
export async function markModifiedBy(matchDayId: string, userId: string) {
  const updates: MatchDaysUpdate = {
    last_modified_by: userId,
    last_modified_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("match_days")
    .update(updates)
    .eq("id", matchDayId);
  if (error) throw error;
}
// import { supabase } from "@/integrations/supabase/client";

/**
 * Marks the match_day row as modified by the current user and returns the new values.
 * This version SELECTs the updated row back so we can see exactly what happened.
 */
// export async function markModifiedBy(matchDayId: string, userId: string) {
//   const updates = {
//     last_modified_by: userId,
//     last_modified_at: new Date().toISOString(),
//   } satisfies Record<string, unknown>;

//   const { data, error, status } = await supabase
//     .from("match_days")
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     .update(updates as any)
//     .eq("id", matchDayId)
//     .select("id, club_id, last_modified_by, last_modified_at")
//     .single();

//   // Hard logging so we can see the truth in DevTools
//   // - If RLS blocks, 'error' will be non-null (status usually 401 or 403)
//   // - If the filter didn't match, PostgREST returns 406/400 or throws on .single()
//   // - If success, 'data' will show the updated audit fields
//   //console.log("[markModifiedBy] status:", status);
//   //console.log("[markModifiedBy] error:", error);
//   //console.log("[markModifiedBy] data:", data);

//   if (error) throw error;
//   return data;
// }
