import { getSupabaseClient } from "./clientHolder";
import type { PlayerStats } from "./playerStats";

export function calculateGameplayBonus(stats: PlayerStats): number {
  const participationBonus =
    10 * (Math.log10(stats.gamesPlayed + 1) / Math.log10(1001));

  const winRateBonus =
    stats.gamesPlayed >= 5 ? 3 * (stats.winRate / 100) : 0;

  const hoursBonus =
    2 * (Math.log10(stats.totalHours + 1) / Math.log10(501));

  return Math.min(15, participationBonus + winRateBonus + hoursBonus);
}

export async function recalculateAndPersist(
  playerId: string,
  currentRating: number,
  stats: PlayerStats
): Promise<number | null> {
  const supabase = getSupabaseClient();
  const { data: player } = await supabase
    .from("players")
    .select("rating_history")
    .eq("id", playerId)
    .single();

  const history = Array.isArray(player?.rating_history)
    ? (player.rating_history as { date: string; rating: number; type: string }[])
    : null;

  const baseEntry = history?.[0];
  const baseRating = baseEntry?.rating ?? currentRating;

  const bonus = calculateGameplayBonus(stats);
  const computed = Math.min(100, Math.round(baseRating + bonus));
  const newRating = Math.max(currentRating, computed);

  if (newRating <= currentRating) return null;

  const updatedHistory = history
    ? [...history]
    : [{ date: new Date().toISOString(), rating: currentRating, type: "baseline" }];

  updatedHistory.push({
    date: new Date().toISOString(),
    rating: newRating,
    type: "gameplay",
  });

  await supabase
    .from("players")
    .update({
      skill_rating: newRating,
      last_rating_update: new Date().toISOString(),
      total_matches_played: stats.gamesPlayed,
      rating_history: updatedHistory,
    })
    .eq("id", playerId);

  return newRating;
}
