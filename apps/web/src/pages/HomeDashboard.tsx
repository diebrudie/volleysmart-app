import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { parseISO, format, startOfMonth, endOfMonth } from "date-fns";
import { getDateLocale } from "@/lib/dateLocale";
import { Volleyball, Trophy, TrendingUp, CheckCircle2, Eye, Users, Plus, Compass, CalendarDays, Swords, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentPlayerId } from "@/hooks/useCurrentPlayerId";
import { useIsCompact } from "@/hooks/use-compact";
import Navbar from "@/components/layout/Navbar";
import { fetchPublicEvents } from "@/integrations/supabase/plannedEvents";
import { fetchUserClubIds } from "@/integrations/supabase/clubMembers";
import { EventCard } from "@/components/events/EventCard";

// ─── Data hooks ──────────────────────────────────────────────────────────────

function useUserClubs(userId: string | undefined) {
  return useQuery({
    queryKey: ["home-user-clubs", userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from("club_members")
        .select("club_id, clubs(id, name, city)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []).map((m) => ({
        id: m.club_id,
        name: (m.clubs as any)?.name ?? "",
        city: (m.clubs as any)?.city ?? null,
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}

function useTodaysEvents(userId: string | undefined, playerId: string | null | undefined) {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  return useQuery({
    queryKey: ["home-todays-events", userId, playerId, todayStr],
    queryFn: async () => {
      if (!userId) return null;

      // Get club IDs the same proven way as plannedEvents.ts
      const { data: memberships } = await supabase
        .from("club_members")
        .select("club_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .eq("status", "active");

      const clubIds = (memberships ?? [])
        .map((m) => m.club_id)
        .filter(Boolean) as string[];

      const selectFields = `id, title, date, club_id,
           clubs!planned_events_club_id_fkey(name),
           event_rsvp(status, player_id)`;

      // 1. Club events today (skip events the user declined)
      let todayEvent: any = null;
      if (clubIds.length) {
        const { data, error } = await supabase
          .from("planned_events")
          .select(selectFields)
          .in("club_id", clubIds)
          .eq("date", todayStr)
          .in("status", ["open", "confirmed"])
          .limit(5);
        if (error) throw error;
        // Pick first event the user hasn't declined
        todayEvent = (data ?? []).find((ev: any) => {
          if (!playerId) return true;
          const userRsvp = (ev.event_rsvp ?? []).find((r: any) => r.player_id === playerId);
          return !userRsvp || userRsvp.status !== "declined";
        }) ?? null;
      }

      // 2. If no club event, check RSVPed events today
      if (!todayEvent && playerId) {
        const { data: rsvps } = await supabase
          .from("event_rsvp")
          .select("event_id")
          .eq("player_id", playerId)
          .eq("status", "attending");
        const rsvpedIds = (rsvps ?? []).map((r) => r.event_id);
        if (rsvpedIds.length) {
          const { data } = await supabase
            .from("planned_events")
            .select(selectFields)
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
          .select(selectFields)
          .in("club_id", clubIds)
          .in("status", ["open", "confirmed"])
          .gt("date", todayStr)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true })
          .limit(5);

        selectedEvent = (nextEvents ?? []).find((ev: any) => {
          if (!playerId) return true;
          const userRsvp = (ev.event_rsvp ?? []).find((r: any) => r.player_id === playerId);
          return !userRsvp || userRsvp.status !== "declined";
        }) ?? null;
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
      const attendingCount = rsvps.filter((r) => r.status === "attending").length;
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
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

function useLastGame(playerId: string | null | undefined) {
  return useQuery({
    queryKey: ["home-last-game", playerId],
    queryFn: async () => {
      if (!playerId) return null;
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

      for (const gp of data ?? []) {
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
              ? "A"
              : teamBWins > teamAWins
              ? "B"
              : "draw",
        };
      }
      return null;
    },
    enabled: !!playerId,
    staleTime: 5 * 60 * 1000,
  });
}

function useMonthlyStats(
  userId: string | undefined,
  playerId: string | null | undefined,
  clubIds: string[]
) {
  return useQuery({
    queryKey: ["home-monthly-stats", userId, playerId, clubIds],
    queryFn: async () => {
      if (!userId || !playerId) return { gamesPlayed: 0, winRate: 0, hoursPlayed: 0 };

      const now = new Date();
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

      // Games played this month + team info + event links
      const { data: monthGPs } = await supabase
        .from("game_players")
        .select("match_day_id, team_name, match_days!inner(date, planned_event_id)")
        .eq("player_id", playerId)
        .gte("match_days.date" as any, monthStart)
        .lte("match_days.date" as any, monthEnd);

      const gpsArr = monthGPs ?? [];
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

        let setsWon = 0, setsTotal = 0;
        for (const s of sets ?? []) {
          if (s.team_a_score + s.team_b_score === 0) continue;
          setsTotal++;
          const team = playerTeamMap.get(s.match_day_id);
          if ((team === "team_a" && s.team_a_score > s.team_b_score) ||
              (team === "team_b" && s.team_b_score > s.team_a_score)) setsWon++;
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

        for (const ev of events ?? []) {
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
    enabled: !!userId && !!playerId && clubIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

const HomeDashboard: React.FC = () => {
  const { t } = useTranslation("events");
  const { t: tGames } = useTranslation("games");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: playerId } = useCurrentPlayerId();
  const isCompact = useIsCompact();
  const { data: clubs = [] } = useUserClubs(user?.id);
  const clubIds = clubs.map((c) => c.id).filter(Boolean) as string[];

  const { data: todaysEvent } = useTodaysEvents(user?.id, playerId);
  const { data: lastGame } = useLastGame(playerId);
  const { data: monthlyStats } = useMonthlyStats(user?.id, playerId, clubIds);

  // Discover events: public events from clubs user is NOT a member of
  const { data: userClubIds = [] } = useQuery({
    queryKey: ["user-club-ids", user?.id],
    queryFn: () => fetchUserClubIds(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: publicEvents = [] } = useQuery({
    queryKey: ["public-events"],
    queryFn: fetchPublicEvents,
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const isNewUser = clubs.length === 0;

  // Player info for empty state message + onboarding cards
  const { data: playerInfo } = useQuery({
    queryKey: ["player-info", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("players")
        .select("city, first_name, skill_rating")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data ?? null;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  const discoverEvents = React.useMemo(() => {
    const clubIdSet = new Set(userClubIds);
    return publicEvents.filter((e) => !clubIdSet.has(e.club_id)).slice(0, 3);
  }, [publicEvents, userClubIds]);

  // Slider state
  const sliderRef = React.useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = React.useState(0);
  const totalSlides = 3;

  // Observe scroll position for dot indicators (mobile only)
  React.useEffect(() => {
    if (!isCompact) return;
    const el = sliderRef.current;
    if (!el) return;
    const handleScroll = () => {
      const scrollLeft = el.scrollLeft;
      const cardWidth = el.firstElementChild
        ? (el.firstElementChild as HTMLElement).offsetWidth + 12
        : 1;
      setActiveSlide(Math.round(scrollLeft / cardWidth));
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [isCompact]);

  // Auto-rotate every 15s (mobile only)
  React.useEffect(() => {
    if (!isCompact) return;
    const el = sliderRef.current;
    if (!el) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % totalSlides;
        const card = el.children[next] as HTMLElement | undefined;
        if (card) {
          el.scrollTo({ left: card.offsetLeft - 16, behavior: "smooth" });
        }
        return next;
      });
    }, 15000);
    return () => clearInterval(interval);
  }, [totalSlides, isCompact]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {!isCompact && <Navbar />}
      <main className="flex-1 pb-24 lg:ml-60">
        <div className="max-w-7xl mx-auto px-4 pt-6">
          {/* ─── Top Slider ──────────────────────────────────────── */}
          <div
            ref={sliderRef}
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:snap-none lg:mx-0 lg:px-0 lg:pb-0"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              scrollPaddingInline: "1rem",
            }}
          >
            {isNewUser ? (
              <>
                {/* Onboarding Card 1 — Welcome + Skill Level */}
                <div className="snap-start shrink-0 w-[85vw] sm:w-[340px] lg:w-auto border border-border rounded-xl bg-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Volleyball className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {t("home.onboarding.welcome")}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <p className="text-lg font-semibold text-foreground">
                      {t("home.onboarding.hiName", { name: playerInfo?.first_name ?? "" })}
                    </p>
                    {playerInfo?.skill_rating != null && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{t("home.onboarding.yourSkillLevel")}</span>
                          <span className="font-semibold text-foreground">{playerInfo.skill_rating}/100</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${playerInfo.skill_rating}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate(`/user/${user?.id}`)}
                    >
                      {t("home.onboarding.viewProfile")}
                    </Button>
                  </div>
                </div>

                {/* Onboarding Card 2 — Create or Join a Club */}
                <div className="snap-start shrink-0 w-[85vw] sm:w-[340px] lg:w-auto border border-primary/30 rounded-xl bg-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {t("home.onboarding.getStarted")}
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {t("home.onboarding.clubsDescription")}
                    </p>
                    <Button className="w-full" onClick={() => navigate("/new-club")}>
                      <Plus className="h-4 w-4 mr-1.5" />
                      {t("home.onboarding.createClub")}
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => navigate("/clubs")}>
                      <Compass className="h-4 w-4 mr-1.5" />
                      {t("home.onboarding.browseClubs")}
                    </Button>
                  </div>
                </div>

                {/* Onboarding Card 3 — Analytics Teaser */}
                <div
                  className="snap-start shrink-0 w-[85vw] sm:w-[340px] lg:w-auto border border-border rounded-xl bg-card p-5 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => navigate(`/user/${user?.id}?tab=analytics`)}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {t("home.onboarding.yourStats")}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t("home.onboarding.playToUnlock")}
                  </p>
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="text-center">
                      <Swords className="h-4 w-4 text-primary mx-auto mb-1" />
                      <p className="text-3xl font-bold text-muted-foreground/40">--</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("home.games")}</p>
                    </div>
                    <div className="text-center">
                      <TrendingUp className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                      <p className="text-3xl font-bold text-muted-foreground/40">--</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("home.winRate")}</p>
                    </div>
                    <div className="text-center">
                      <Clock className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                      <p className="text-3xl font-bold text-muted-foreground/40">--</p>
                      <p className="text-xs text-muted-foreground mt-1">{t("home.hours")}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Slide order: Today's Game first when there IS a game today, Last Game first otherwise */}
                {todaysEvent ? (
                  <>
                    {/* Today's Game or Next Event (primary) */}
                    <div className="snap-start shrink-0 w-[85vw] sm:w-[340px] lg:w-auto border border-border rounded-xl bg-card p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Volleyball className="h-5 w-5 text-primary" />
                          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            {todaysEvent.isToday ? t("home.todaysGame") : t("home.nextEvent")}
                          </h3>
                        </div>
                        {todaysEvent.currentUserRsvp === "attending" && (
                          <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                            {t("home.youreGoing")}
                          </span>
                        )}
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-lg font-semibold text-foreground">
                            {todaysEvent.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {todaysEvent.clubName}
                            {!todaysEvent.isToday && todaysEvent.date && (
                              <> &middot; {format(parseISO(todaysEvent.date), "d MMM yyyy", { locale: getDateLocale() })}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {t("home.playersAttending", { count: todaysEvent.attendingCount })}
                        </div>
                        {todaysEvent.isToday ? (
                          <Button
                            className="w-full"
                            variant={todaysEvent.matchDayId ? "outline" : "default"}
                            onClick={() =>
                              todaysEvent.matchDayId
                                ? navigate(`/game/${todaysEvent.matchDayId}`)
                                : navigate(`/events/${todaysEvent.eventId}`)
                            }
                          >
                            {todaysEvent.matchDayId ? t("home.viewGame") : t("home.startGame")}
                          </Button>
                        ) : (
                          <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => navigate(`/events/${todaysEvent.eventId}`)}
                          >
                            {t("home.viewEvent")}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Last Game (secondary) */}
                    <div
                      className={`snap-start shrink-0 w-[85vw] sm:w-[340px] lg:w-auto border border-border rounded-xl bg-card p-5 ${
                        lastGame ? "cursor-pointer hover:shadow-md transition-shadow" : ""
                      }`}
                      onClick={() =>
                        lastGame && navigate(`/game/${lastGame.matchDayId}`)
                      }
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-primary" />
                          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            {t("home.lastGame")}
                          </h3>
                        </div>
                        {lastGame && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Eye className="h-4 w-4" />
                            {t("home.view")}
                          </span>
                        )}
                      </div>
                      {lastGame ? (
                        <div className="space-y-2 text-center">
                          <p className="text-lg font-semibold text-foreground">
                            {lastGame.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {lastGame.clubName} &middot;{" "}
                            {format(parseISO(lastGame.date), "d MMM yyyy", { locale: getDateLocale() })}
                          </p>
                          <div className="flex items-center justify-center gap-3 pt-2">
                            <span className="text-4xl font-bold text-red-500">
                              {lastGame.teamAWins}
                            </span>
                            <span className="text-2xl font-bold text-foreground">-</span>
                            <span className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                              {lastGame.teamBWins}
                            </span>
                          </div>
                          <p className="text-sm">
                            {lastGame.winner === "draw" ? (
                              <span className="text-muted-foreground">{t("home.draw")}</span>
                            ) : (
                              <>
                                <span className={`font-medium ${
                                  lastGame.winner === "A"
                                    ? "text-red-500"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }`}>
                                  {tGames(`game.team${lastGame.winner}`)}
                                </span>{" "}
                                <span className={`font-medium ${
                                  lastGame.winner === "A"
                                    ? "text-red-500"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }`}>{t("home.wins")}</span>
                              </>
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="py-6 text-center">
                          <p className="text-muted-foreground text-sm">
                            {t("home.noGamesYet")}
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Last Game (primary — no game today) */}
                    <div
                      className={`snap-start shrink-0 w-[85vw] sm:w-[340px] lg:w-auto border border-border rounded-xl bg-card p-5 ${
                        lastGame ? "cursor-pointer hover:shadow-md transition-shadow" : ""
                      }`}
                      onClick={() =>
                        lastGame && navigate(`/game/${lastGame.matchDayId}`)
                      }
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 text-primary" />
                          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            {t("home.lastGame")}
                          </h3>
                        </div>
                        {lastGame && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Eye className="h-4 w-4" />
                            {t("home.view")}
                          </span>
                        )}
                      </div>
                      {lastGame ? (
                        <div className="space-y-2 text-center">
                          <p className="text-lg font-semibold text-foreground">
                            {lastGame.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {lastGame.clubName} &middot;{" "}
                            {format(parseISO(lastGame.date), "d MMM yyyy", { locale: getDateLocale() })}
                          </p>
                          <div className="flex items-center justify-center gap-3 pt-2">
                            <span className="text-4xl font-bold text-red-500">
                              {lastGame.teamAWins}
                            </span>
                            <span className="text-2xl font-bold text-foreground">-</span>
                            <span className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                              {lastGame.teamBWins}
                            </span>
                          </div>
                          <p className="text-sm">
                            {lastGame.winner === "draw" ? (
                              <span className="text-muted-foreground">{t("home.draw")}</span>
                            ) : (
                              <>
                                <span className={`font-medium ${
                                  lastGame.winner === "A"
                                    ? "text-red-500"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }`}>
                                  {tGames(`game.team${lastGame.winner}`)}
                                </span>{" "}
                                <span className={`font-medium ${
                                  lastGame.winner === "A"
                                    ? "text-red-500"
                                    : "text-emerald-600 dark:text-emerald-400"
                                }`}>{t("home.wins")}</span>
                              </>
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="py-6 text-center">
                          <p className="text-muted-foreground text-sm">
                            {t("home.noGamesYet")}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Today's Game (secondary — no game today) */}
                    <div className="snap-start shrink-0 w-[85vw] sm:w-[340px] lg:w-auto border border-border rounded-xl bg-card p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Volleyball className="h-5 w-5 text-primary" />
                          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            {t("home.todaysGame")}
                          </h3>
                        </div>
                      </div>
                      <div className="py-6 text-center space-y-3">
                        <p className="text-muted-foreground text-sm">
                          {t("home.noGameToday")}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => navigate("/events/new")}
                        >
                          <Plus className="h-4 w-4 mr-1.5" />
                          {t("home.createEvent")}
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                {/* Card 3 — Monthly Stats */}
                <div
                  className="snap-start shrink-0 w-[85vw] sm:w-[340px] lg:w-auto border border-border rounded-xl bg-card p-5 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => navigate(`/user/${user?.id}?tab=analytics`)}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      {t("home.thisMonth")}
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    <div className="text-center">
                      <Swords className="h-4 w-4 text-primary mx-auto mb-1" />
                      <p className="text-3xl font-bold text-foreground">
                        {monthlyStats?.gamesPlayed ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("home.games")}
                      </p>
                    </div>
                    <div className="text-center">
                      <TrendingUp className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                      <p className="text-3xl font-bold text-foreground">
                        {monthlyStats?.winRate ?? 0}%
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("home.winRate")}
                      </p>
                    </div>
                    <div className="text-center">
                      <Clock className="h-4 w-4 text-blue-500 mx-auto mb-1" />
                      <p className="text-3xl font-bold text-foreground">
                        {monthlyStats?.hoursPlayed ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("home.hours")}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Trailing spacer (mobile only) */}
            <div className="shrink-0 w-1 lg:hidden" aria-hidden="true" />
          </div>

          {/* Dot indicators (mobile only) */}
          {isCompact && (
            <div className="flex justify-center gap-1.5 pt-3">
              {Array.from({ length: totalSlides }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i === activeSlide ? "bg-muted-foreground" : "bg-border"
                  }`}
                />
              ))}
            </div>
          )}

          {/* ─── Discover Events ──────────────────────────────────── */}
          <section className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-bold text-foreground">
                  {t("home.discoverEvents")}
                </h2>
              </div>
              {discoverEvents.length > 0 && (
                <button
                  type="button"
                  onClick={() => navigate("/discover-events")}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t("home.seeMore")}
                </button>
              )}
            </div>

            {discoverEvents.length > 0 ? (
              <div className="grid gap-3">
                {discoverEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    currentPlayerId={playerId}
                    onClick={() => navigate(`/events/${event.id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center rounded-xl border bg-card">
                <CalendarDays className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {playerInfo?.city
                    ? t("home.noPublicEvents", { city: playerInfo.city })
                    : t("home.noPublicEventsDefault")}
                </p>
                <Button
                  size="sm"
                  onClick={() => navigate("/events/new")}
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t("home.createEvent")}
                </Button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default HomeDashboard;
