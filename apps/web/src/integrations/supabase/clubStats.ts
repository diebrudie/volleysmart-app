import { supabase } from "./client";

export interface ClubStats {
  totalEncounters: number;
  totalHours: number;
  attendanceRate: number; // percentage 0-100
  topCombinations: TeamCombination[];
}

export interface TeamCombination {
  playerNames: string[];
  gamesPlayed: number;
  wins: number;
  winRate: number;
}

/**
 * Fetch club-level analytics for a given year.
 */
export async function fetchClubStats(
  clubId: string,
  year?: number
): Promise<ClubStats> {
  const targetYear = year ?? new Date().getFullYear();
  const yearStart = `${targetYear}-01-01`;
  const yearEnd = `${targetYear}-12-31`;

  // 1. Match days this year
  const { data: matchDays } = await supabase
    .from("match_days")
    .select("id, planned_event_id, date")
    .eq("club_id", clubId)
    .gte("date", yearStart)
    .lte("date", yearEnd);

  const totalEncounters = matchDays?.length ?? 0;
  if (!totalEncounters) return emptyStats();

  const mdIds = matchDays!.map((md) => md.id);

  // 2. Total hours from linked events
  const eventIds = matchDays!
    .map((md) => md.planned_event_id)
    .filter(Boolean) as string[];

  let totalHours = 0;
  if (eventIds.length) {
    const { data: events } = await supabase
      .from("planned_events")
      .select("start_time, end_time")
      .in("id", eventIds);

    for (const ev of events ?? []) {
      if (ev.start_time && ev.end_time) {
        const [sh, sm] = ev.start_time.split(":").map(Number);
        const [eh, em] = ev.end_time.split(":").map(Number);
        const hours = (eh * 60 + em - (sh * 60 + sm)) / 60;
        if (hours > 0) totalHours += hours;
      }
    }
  }

  // 3. Attendance rate (association members only)
  // Get all events for this club this year
  const { data: clubEvents } = await supabase
    .from("planned_events")
    .select("id")
    .eq("club_id", clubId)
    .gte("date", yearStart)
    .lte("date", yearEnd)
    .in("status", ["open", "confirmed", "completed"]);

  let attendanceRate = 0;
  if (clubEvents?.length) {
    const clubEventIds = clubEvents.map((e) => e.id);

    // Count association members
    const { count: assocCount } = await supabase
      .from("club_members")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("is_active", true)
      .eq("status", "active")
      .eq("member_association", true);

    if (assocCount && assocCount > 0) {
      // Get association member user IDs → player IDs
      const { data: assocMembers } = await supabase
        .from("club_members")
        .select("user_id")
        .eq("club_id", clubId)
        .eq("is_active", true)
        .eq("status", "active")
        .eq("member_association", true);

      const assocUserIds = (assocMembers ?? []).map((m) => m.user_id);
      const { data: assocPlayers } = await supabase
        .from("players")
        .select("id")
        .in("user_id", assocUserIds);

      const assocPlayerIds = (assocPlayers ?? []).map((p) => p.id);

      if (assocPlayerIds.length) {
        // Count RSVPs from association members
        const { count: attendingCount } = await supabase
          .from("event_rsvp")
          .select("id", { count: "exact", head: true })
          .in("event_id", clubEventIds)
          .in("player_id", assocPlayerIds)
          .eq("status", "attending");

        const maxAttendance = assocPlayerIds.length * clubEventIds.length;
        attendanceRate = maxAttendance > 0
          ? Math.round(((attendingCount ?? 0) / maxAttendance) * 100)
          : 0;
      }
    }
  }

  // 4. Best team combinations (top 3)
  // Get all game_players for these match days
  const { data: gamePlayers } = await supabase
    .from("game_players")
    .select("match_day_id, player_id, team_name")
    .in("match_day_id", mdIds);

  // Get all set scores
  const { data: sets } = await supabase
    .from("matches")
    .select("match_day_id, team_a_score, team_b_score")
    .in("match_day_id", mdIds);

  // Compute per-match-day winner (team_a or team_b)
  const mdWinner = new Map<string, string>(); // match_day_id → 'team_a' | 'team_b' | 'tie'
  const mdSetCounts = new Map<string, { a: number; b: number }>();
  for (const s of sets ?? []) {
    if (s.team_a_score + s.team_b_score === 0) continue;
    const entry = mdSetCounts.get(s.match_day_id) ?? { a: 0, b: 0 };
    if (s.team_a_score > s.team_b_score) entry.a++;
    else if (s.team_b_score > s.team_a_score) entry.b++;
    mdSetCounts.set(s.match_day_id, entry);
  }
  for (const [mdId, counts] of mdSetCounts) {
    if (counts.a > counts.b) mdWinner.set(mdId, "team_a");
    else if (counts.b > counts.a) mdWinner.set(mdId, "team_b");
    else mdWinner.set(mdId, "tie");
  }

  // Group players by team per match day, create combination keys
  const teamGroups = new Map<string, { mdId: string; teamName: string; playerIds: string[] }[]>();
  for (const gp of gamePlayers ?? []) {
    const key = `${gp.match_day_id}_${gp.team_name}`;
    if (!teamGroups.has(key)) teamGroups.set(key, []);
    teamGroups.get(key)!.push({ mdId: gp.match_day_id, teamName: gp.team_name, playerIds: [] });
  }

  // Rebuild: group by match_day + team → sorted player list
  const combos = new Map<string, { playerIds: string[]; played: number; wins: number }>();
  const mdTeamPlayers = new Map<string, string[]>(); // "mdId_team" → player_id[]
  for (const gp of gamePlayers ?? []) {
    const key = `${gp.match_day_id}_${gp.team_name}`;
    const list = mdTeamPlayers.get(key) ?? [];
    list.push(gp.player_id);
    mdTeamPlayers.set(key, list);
  }

  for (const [key, playerIds] of mdTeamPlayers) {
    const [mdId, teamName] = key.split("_");
    const sorted = [...playerIds].sort();
    const comboKey = sorted.join(",");
    const entry = combos.get(comboKey) ?? { playerIds: sorted, played: 0, wins: 0 };
    entry.played++;
    if (mdWinner.get(mdId) === teamName) entry.wins++;
    combos.set(comboKey, entry);
  }

  // Get player names for top combos
  const allPlayerIds = [...new Set((gamePlayers ?? []).map((gp) => gp.player_id))];
  const { data: playerRows } = await supabase
    .from("players")
    .select("id, first_name, last_name")
    .in("id", allPlayerIds);

  const playerNameMap = new Map<string, string>();
  for (const p of playerRows ?? []) {
    playerNameMap.set(p.id, `${p.first_name} ${p.last_name?.charAt(0) ?? ""}.`);
  }

  // Sort combos: most wins, then most played, take top 3
  const topCombinations: TeamCombination[] = [...combos.values()]
    .filter((c) => c.played >= 2) // at least 2 games together
    .sort((a, b) => b.wins - a.wins || b.played - a.played)
    .slice(0, 3)
    .map((c) => ({
      playerNames: c.playerIds.map((id) => playerNameMap.get(id) ?? "Unknown"),
      gamesPlayed: c.played,
      wins: c.wins,
      winRate: c.played > 0 ? Math.round((c.wins / c.played) * 100) : 0,
    }));

  return {
    totalEncounters,
    totalHours: Math.round(totalHours * 10) / 10,
    attendanceRate,
    topCombinations,
  };
}

function emptyStats(): ClubStats {
  return {
    totalEncounters: 0,
    totalHours: 0,
    attendanceRate: 0,
    topCombinations: [],
  };
}
