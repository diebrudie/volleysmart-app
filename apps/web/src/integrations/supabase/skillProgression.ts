import { supabase } from "./client";
import type { PlayerStats } from "./playerStats";

/**
 * Calculate gameplay bonus points (max 25) based on player stats.
 * Uses logarithmic curves so early games give bigger jumps.
 */
export function calculateGameplayBonus(stats: PlayerStats): number {
  // Participation: 15 × log10(games+1) / log10(101) — max 15 pts
  const participationBonus =
    15 * (Math.log10(stats.gamesPlayed + 1) / Math.log10(101));

  // Win rate: 6.25 × (winRate/100) — only after 3+ games, max 6.25 pts
  const winRateBonus =
    stats.gamesPlayed >= 3 ? 6.25 * (stats.winRate / 100) : 0;

  // Hours: 3.75 × log10(hours+1) / log10(51) — max 3.75 pts
  const hoursBonus =
    3.75 * (Math.log10(stats.totalHours + 1) / Math.log10(51));

  return Math.min(25, participationBonus + winRateBonus + hoursBonus);
}

/**
 * Recalculate a player's skill rating based on gameplay and persist if changed.
 * Score never decreases — returns new rating or null if unchanged.
 */
export async function recalculateAndPersist(
  playerId: string,
  currentRating: number,
  stats: PlayerStats
): Promise<number | null> {
  const bonus = calculateGameplayBonus(stats);
  // Base rating is current stored rating (could be old-scale or new-scale)
  // New score = max(current, current + bonus rounded)
  // Since bonus >= 0 and we use max, score never decreases
  const newRating = Math.min(100, Math.round(currentRating + bonus));

  if (newRating <= currentRating) return null;

  // Fetch existing rating_history
  const { data: player } = await supabase
    .from("players")
    .select("rating_history")
    .eq("id", playerId)
    .single();

  const history = Array.isArray(player?.rating_history)
    ? (player.rating_history as { date: string; rating: number; type: string }[])
    : [{ date: new Date().toISOString(), rating: currentRating, type: "baseline" }];

  history.push({
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
      rating_history: history,
    })
    .eq("id", playerId);

  return newRating;
}
