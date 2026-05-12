import { getSupabaseClient } from "./clientHolder";

export interface PlayerStats {
  gamesPlayed: number;
  setsWon: number;
  setsLost: number;
  setsTied: number;
  matchDaysWon: number;
  matchDaysLost: number;
  matchDaysTied: number;
  totalHours: number;
  winRate: number; // percentage 0-100
}

/**
 * Fetch personal analytics for a player, optionally filtered by club and/or year.
 */
export async function fetchPlayerStats(
  playerId: string,
  clubId?: string | null,
  year?: number | null
): Promise<PlayerStats> {
  const supabase = getSupabaseClient();
  // 1. Get all match_days the player participated in
  let gpQuery = supabase
    .from("game_players")
    .select("match_day_id, team_name")
    .eq("player_id", playerId);

  const { data: gamePlayerRows } = await gpQuery;
  if (!gamePlayerRows?.length) return emptyStats();

  const matchDayIds = [...new Set(gamePlayerRows.map((r) => r.match_day_id))];

  // 2. Get match_days with optional club + year filter
  let mdQuery = supabase
    .from("match_days")
    .select("id, planned_event_id, created_at")
    .in("id", matchDayIds);

  if (clubId) {
    mdQuery = mdQuery.eq("club_id", clubId);
  }
  if (year) {
    mdQuery = mdQuery.gte("created_at", `${year}-01-01`).lt("created_at", `${year + 1}-01-01`);
  }

  const { data: matchDays } = await mdQuery;
  if (!matchDays?.length) return emptyStats();

  const filteredMdIds = matchDays.map((md) => md.id);

  // Build map: match_day_id → player's team
  const playerTeamMap = new Map<string, string>();
  for (const gp of gamePlayerRows) {
    if (filteredMdIds.includes(gp.match_day_id)) {
      playerTeamMap.set(gp.match_day_id, gp.team_name);
    }
  }

  // 3. Get all set scores for these match days
  const { data: sets } = await supabase
    .from("matches")
    .select("match_day_id, team_a_score, team_b_score")
    .in("match_day_id", filteredMdIds);

  let setsWon = 0;
  let setsLost = 0;
  let setsTied = 0;

  // Track per-match-day: sets won by player's team
  const mdSetWins = new Map<string, { won: number; lost: number }>();

  for (const s of sets ?? []) {
    const total = s.team_a_score + s.team_b_score;
    if (total === 0) continue; // not played

    const playerTeam = playerTeamMap.get(s.match_day_id);
    if (!playerTeam) continue;

    const playerWon =
      (playerTeam === "team_a" && s.team_a_score > s.team_b_score) ||
      (playerTeam === "team_b" && s.team_b_score > s.team_a_score);
    const playerLost =
      (playerTeam === "team_a" && s.team_a_score < s.team_b_score) ||
      (playerTeam === "team_b" && s.team_b_score < s.team_a_score);

    if (playerWon) setsWon++;
    else if (playerLost) setsLost++;
    else setsTied++;

    const entry = mdSetWins.get(s.match_day_id) ?? { won: 0, lost: 0 };
    if (playerWon) entry.won++;
    else if (playerLost) entry.lost++;
    mdSetWins.set(s.match_day_id, entry);
  }

  // Match day wins/losses/ties (who won more sets)
  let matchDaysWon = 0;
  let matchDaysLost = 0;
  let matchDaysTied = 0;

  for (const [, entry] of mdSetWins) {
    if (entry.won > entry.lost) matchDaysWon++;
    else if (entry.lost > entry.won) matchDaysLost++;
    else matchDaysTied++;
  }

  // 4. Total hours from linked planned events
  const eventIds = matchDays
    .map((md) => md.planned_event_id)
    .filter(Boolean) as string[];

  let totalHours = 0;
  if (eventIds.length > 0) {
    const { data: events } = await supabase
      .from("planned_events")
      .select("start_time, end_time")
      .in("id", eventIds);

    for (const ev of events ?? []) {
      if (ev.start_time && ev.end_time) {
        // Parse TIME strings "HH:MM:SS"
        const [sh, sm] = ev.start_time.split(":").map(Number);
        const [eh, em] = ev.end_time.split(":").map(Number);
        const hours = (eh * 60 + em - (sh * 60 + sm)) / 60;
        if (hours > 0) totalHours += hours;
      }
    }
  }

  const gamesPlayed = mdSetWins.size;
  const totalSets = setsWon + setsLost + setsTied;
  const winRate = totalSets > 0 ? Math.round((setsWon / totalSets) * 100) : 0;

  return {
    gamesPlayed,
    setsWon,
    setsLost,
    setsTied,
    matchDaysWon,
    matchDaysLost,
    matchDaysTied,
    totalHours: Math.round(totalHours * 10) / 10,
    winRate,
  };
}

function emptyStats(): PlayerStats {
  return {
    gamesPlayed: 0,
    setsWon: 0,
    setsLost: 0,
    setsTied: 0,
    matchDaysWon: 0,
    matchDaysLost: 0,
    matchDaysTied: 0,
    totalHours: 0,
    winRate: 0,
  };
}
