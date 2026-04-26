import { supabase } from "./client";
import type { PlayerStats } from "./playerStats";

/**
 * Calculate gameplay bonus points (max 15) based on player stats.
 *
 * Growth is intentionally very slow:
 * - 10 games → ~3 pts, 50 games → ~6 pts, 200 games → ~9 pts, 500+ games → ~12 pts
 * - Reaching 90+ requires years of consistent play with a high win rate.
 * - Score 100 is practically unreachable.
 *
 * Uses log base 1000 so diminishing returns are steep.
 */
export function calculateGameplayBonus(stats: PlayerStats): number {
  // Participation: max 10 pts — log1000 curve, extremely slow growth
  // log10(games+1) / log10(1001) → reaches ~5 at 30 games, ~7.5 at 100, ~10 at 1000
  const participationBonus =
    10 * (Math.log10(stats.gamesPlayed + 1) / Math.log10(1001));

  // Win rate: max 3 pts — only after 5+ games, linear
  const winRateBonus =
    stats.gamesPlayed >= 5 ? 3 * (stats.winRate / 100) : 0;

  // Hours: max 2 pts — log curve, very slow
  const hoursBonus =
    2 * (Math.log10(stats.totalHours + 1) / Math.log10(501));

  return Math.min(15, participationBonus + winRateBonus + hoursBonus);
}

/**
 * Recalculate a player's skill rating based on gameplay and persist if changed.
 * Score never decreases — returns new rating or null if unchanged.
 *
 * Uses the *base onboarding score* from rating_history (not the current stored
 * rating) so the bonus is always relative to the original assessment.
 */
export async function recalculateAndPersist(
  playerId: string,
  currentRating: number,
  stats: PlayerStats
): Promise<number | null> {
  // Fetch existing rating_history to find base onboarding score
  const { data: player } = await supabase
    .from("players")
    .select("rating_history")
    .eq("id", playerId)
    .single();

  const history = Array.isArray(player?.rating_history)
    ? (player.rating_history as { date: string; rating: number; type: string }[])
    : null;

  // Find the base score from the first history entry (onboarding/rescale/baseline)
  const baseEntry = history?.[0];
  const baseRating = baseEntry?.rating ?? currentRating;

  const bonus = calculateGameplayBonus(stats);
  // New score = base onboarding score + gameplay bonus, capped at 90
  // Cap at 90 instead of 100 — score 90+ should be reserved for truly elite players
  const computed = Math.min(90, Math.round(baseRating + bonus));
  // Never decrease from stored value
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
