/**
 * match_days helpers: mark page/team modifications.
 * Uses a narrow 'any' cast to tolerate missing columns in stale generated types.

 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export async function markModifiedBy(matchDayId: string) {
  const { error } = await supabase.rpc("mark_match_day_modified", {
    p_match_day_id: matchDayId,
  });
  if (error) throw error;
}
