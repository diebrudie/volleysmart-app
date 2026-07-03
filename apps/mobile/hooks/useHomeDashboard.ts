/**
 * Home dashboard data hooks — port of the inline queries in
 * apps/web/src/pages/HomeDashboard.tsx (useTodaysEvents, useLastGame,
 * useMonthlyStats) to @volleysmart/core's injected Supabase client.
 */
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { getSupabaseClient } from "@volleysmart/core";
import { queryKeys } from "@/constants/queryKeys";
import { useAuth } from "./useAuth";
import { useCurrentPlayerId } from "./useCurrentPlayerId";
import { useUserClubs } from "./useUserClubs";

export type TodayNextEvent = {
  eventId: string;
  title: string;
  clubName: string;
  date: string;
  attendingCount: number;
  matchDayId: string | null;
  currentUserRsvp: string | null;
  isToday: boolean;
};

export type LastGame = {
  matchDayId: string;
  title: string;
  clubName: string;
  date: string;
  teamAWins: number;
  teamBWins: number;
  winner: "A" | "B" | "draw";
};

export type MonthStats = {
  gamesPlayed: number;
  winRate: number;
  hoursPlayed: number;
};

const SELECT_FIELDS = `id, title, date, club_id,
  clubs!planned_events_club_id_fkey(name),
  event_rsvp(status, player_id)`;

/** Today's game (or next upcoming event) for the signed-in player. */
export function useTodayNextEvent() {
  const { user } = useAuth();
  const { data: playerId } = useCurrentPlayerId();
  const todayStr = format(new Date(), "yyyy-MM-dd");

  return useQuery<TodayNextEvent | null>({
    queryKey: queryKeys.home.todaysEvent(user?.id, playerId, todayStr),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!user?.id) return null;
      const supabase = getSupabaseClient();

      const { data: memberships } = await supabase
        .from("club_members")
        .select("club_id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .eq("status", "active");

      const clubIds = (memberships ?? [])
        .map((m: { club_id: string | null }) => m.club_id)
        .filter(Boolean) as string[];

      const notDeclined = (ev: any) => {
        if (!playerId) return true;
        const userRsvp = (ev.event_rsvp ?? []).find(
          (r: any) => r.player_id === playerId
        );
        return !userRsvp || userRsvp.status !== "declined";
      };

      // 1. Club events today (skip events the user declined)
      let todayEvent: any = null;
      if (clubIds.length) {
        const { data, error } = await supabase
          .from("planned_events")
          .select(SELECT_FIELDS)
          .in("club_id", clubIds)
          .eq("date", todayStr)
          .in("status", ["open", "confirmed"])
          .limit(5);
        if (error) throw error;
        todayEvent = (data ?? []).find(notDeclined) ?? null;
      }

      // 2. If no club event, check RSVPed (public) events today
      if (!todayEvent && playerId) {
        const { data: rsvps } = await supabase
          .from("event_rsvp")
          .select("event_id")
          .eq("player_id", playerId)
          .eq("status", "attending");
        const rsvpedIds = (rsvps ?? []).map((r: any) => r.event_id);
        if (rsvpedIds.length) {
          const { data } = await supabase
            .from("planned_events")
            .select(SELECT_FIELDS)
            .eq("date", todayStr)
            .in("status", ["open", "confirmed"])
            .in("id", rsvpedIds)
            .limit(1);
          todayEvent = data?.[0] ?? null;
        }
      }

      // 3. If no event today, fetch next upcoming event
      let selectedEvent = todayEvent;
      let isToday = true;

      if (!selectedEvent && clubIds.length) {
        const { data: nextEvents } = await supabase
          .from("planned_events")
          .select(SELECT_FIELDS)
          .in("club_id", clubIds)
          .in("status", ["open", "confirmed"])
          .gt("date", todayStr)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(5);
        selectedEvent = (nextEvents ?? []).find(notDeclined) ?? null;
        isToday = false;
      }

      if (!selectedEvent) return null;

      // Check if a game already exists for this event
      const { data: matchDay } = await supabase
        .from("match_days")
        .select("id")
        .eq("planned_event_id" as any, selectedEvent.id)
        .maybeSingle();

      const rsvps = (selectedEvent.event_rsvp ?? []) as any[];
      const attendingCount = rsvps.filter(
        (r) => r.status === "attending"
      ).length;
      const currentUserRsvp = playerId
        ? rsvps.find((r) => r.player_id === playerId)?.status ?? null
        : null;

      return {
        eventId: selectedEvent.id,
        title: selectedEvent.title,
        clubName: (selectedEvent.clubs as any)?.name ?? "",
        date: selectedEvent.date,
        attendingCount,
        matchDayId: (matchDay as any)?.id ?? null,
        currentUserRsvp,
        isToday,
      };
    },
  });
}

/** Most recent match day (with at least one played set) for the player. */
export function useLastGame() {
  const { data: playerId } = useCurrentPlayerId();

  return useQuery<LastGame | null>({
    queryKey: queryKeys.home.lastGame(playerId),
    enabled: !!playerId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!playerId) return null;
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("game_players")
        .select(
          `match_day_id,
           match_days!inner(id, date, club_id, clubs(name),
             matches(team_a_score, team_b_score),
             planned_events!planned_event_id(title))`
        )
        .eq("player_id", playerId)
        .order("match_days(date)", { ascending: false })
        .limit(10);
      if (error) throw error;

      for (const gp of (data ?? []) as any[]) {
        const md = gp.match_days as any;
        if (!md?.matches?.length) continue;
        let teamAWins = 0;
        let teamBWins = 0;
        let played = 0;
        for (const m of md.matches) {
          const a = m.team_a_score ?? 0;
          const b = m.team_b_score ?? 0;
          if (a + b === 0) continue;
          played++;
          if (a > b) teamAWins++;
          else if (b > a) teamBWins++;
        }
        if (played === 0) continue;

        const pe = md.planned_events as { title: string } | null;
        const title =
          pe?.title ??
          new Date(md.date).toLocaleDateString("en-US", { weekday: "long" }) +
            " Game";

        return {
          matchDayId: md.id,
          title,
          clubName: md.clubs?.name ?? "",
          date: md.date,
          teamAWins,
          teamBWins,
          winner:
            teamAWins > teamBWins
              ? ("A" as const)
              : teamBWins > teamAWins
                ? ("B" as const)
                : ("draw" as const),
        };
      }
      return null;
    },
  });
}

/** Games / set win rate / hours played for the current calendar month. */
export function useMonthStats() {
  const { user } = useAuth();
  const { data: playerId } = useCurrentPlayerId();
  const { data: clubs } = useUserClubs();
  const clubIds = (clubs ?? []).map((c) => c.club_id).filter(Boolean);

  return useQuery<MonthStats>({
    queryKey: queryKeys.home.monthlyStats(user?.id, playerId, clubIds),
    enabled: !!user?.id && !!playerId && clubIds.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!user?.id || !playerId) {
        return { gamesPlayed: 0, winRate: 0, hoursPlayed: 0 };
      }
      const supabase = getSupabaseClient();

      const now = new Date();
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

      // Games played this month + team info + event links
      const { data: monthGPs } = await supabase
        .from("game_players")
        .select(
          "match_day_id, team_name, match_days!inner(date, planned_event_id)"
        )
        .eq("player_id", playerId)
        .gte("match_days.date" as any, monthStart)
        .lte("match_days.date" as any, monthEnd);

      const gpsArr = (monthGPs ?? []) as any[];
      const monthMdIds = [...new Set(gpsArr.map((gp) => gp.match_day_id))];
      const gamesPlayed = monthMdIds.length;

      // Win rate from set scores
      let winRate = 0;
      if (monthMdIds.length > 0) {
        const playerTeamMap = new Map<string, string>();
        for (const gp of gpsArr) playerTeamMap.set(gp.match_day_id, gp.team_name);

        const { data: sets } = await supabase
          .from("matches")
          .select("match_day_id, team_a_score, team_b_score")
          .in("match_day_id", monthMdIds);

        let setsWon = 0;
        let setsTotal = 0;
        for (const s of (sets ?? []) as any[]) {
          if (s.team_a_score + s.team_b_score === 0) continue;
          setsTotal++;
          const team = playerTeamMap.get(s.match_day_id);
          if (
            (team === "team_a" && s.team_a_score > s.team_b_score) ||
            (team === "team_b" && s.team_b_score > s.team_a_score)
          ) {
            setsWon++;
          }
        }
        winRate = setsTotal > 0 ? Math.round((setsWon / setsTotal) * 100) : 0;
      }

      // Hours from linked events
      let hoursPlayed = 0;
      const eventIds = gpsArr
        .map((gp) => (gp.match_days as any)?.planned_event_id)
        .filter(Boolean) as string[];
      const uniqueEventIds = [...new Set(eventIds)];

      if (uniqueEventIds.length > 0) {
        const { data: events } = await supabase
          .from("planned_events")
          .select("start_time, end_time")
          .in("id", uniqueEventIds);

        for (const ev of (events ?? []) as any[]) {
          if (ev.start_time && ev.end_time) {
            const [sh, sm] = ev.start_time.split(":").map(Number);
            const [eh, em] = ev.end_time.split(":").map(Number);
            const hours = (eh * 60 + em - (sh * 60 + sm)) / 60;
            if (hours > 0) hoursPlayed += hours;
          }
        }
      }

      return {
        gamesPlayed,
        winRate,
        hoursPlayed: Math.round(hoursPlayed * 10) / 10,
      };
    },
  });
}
