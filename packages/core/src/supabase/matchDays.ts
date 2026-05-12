import { getSupabaseClient } from "./clientHolder";

export async function markModifiedBy(matchDayId: string) {
  const supabase = getSupabaseClient();
  const { error } = await supabase.rpc("mark_match_day_modified", {
    p_match_day_id: matchDayId,
  });
  if (error) throw error;
}
