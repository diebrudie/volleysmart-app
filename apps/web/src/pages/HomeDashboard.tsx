import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { parseISO, format, startOfMonth, endOfMonth } from "date-fns";
import { Volleyball, Trophy, TrendingUp, CheckCircle2, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentPlayerId } from "@/hooks/useCurrentPlayerId";

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
        .eq("is_active", true);
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
        .eq("is_active", true);

      const clubIds = (memberships ?? [])
        .map((m) => m.club_id)
        .filter(Boolean) as string[];
      if (!clubIds.length) return null;

      const { data, error } = await supabase
        .from("planned_events")
        .select(
          `id, title, date, club_id,
           clubs!planned_events_club_id_fkey(name),
           event_rsvp(status, player_id)`
        )
        .in("club_id", clubIds)
        .eq("date", todayStr)
        .in("status", ["open", "confirmed"])
        .limit(1);
      if (error) throw error;
      const todayEvent = data?.[0] ?? null;
      if (!todayEvent) return null;

      // Check if a game already exists for this event
      const { data: matchDay } = await supabase
        .from("match_days")
        .select("id")
        .eq("planned_event_id" as any, todayEvent.id)
        .maybeSingle();

      const rsvps = (todayEvent.event_rsvp ?? []) as any[];
      const attendingCount = rsvps.filter((r) => r.status === "attending").length;
      const currentUserRsvp = playerId
        ? rsvps.find((r) => r.player_id === playerId)?.status ?? null
        : null;

      return {
        eventId: todayEvent.id,
        title: todayEvent.title,
        clubName: (todayEvent.clubs as any)?.name ?? "",
        attendingCount,
        matchDayId: (matchDay as any)?.id ?? null,
        currentUserRsvp,
      };
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

function useLastGame(clubIds: string[]) {
  return useQuery({
    queryKey: ["home-last-game", clubIds],
    queryFn: async () => {
      if (!clubIds.length) return null;
      const { data, error } = await supabase
        .from("match_days")
        .select(
          `id, date, club_id, clubs(name),
           matches(team_a_score, team_b_score),
           planned_events!planned_event_id(title)`
        )
        .in("club_id", clubIds)
        .order("date", { ascending: false })
        .limit(10);
      if (error) throw error;

      // Find first match_day that has played matches
      for (const md of data ?? []) {
        if (!md.matches?.length) continue;
        let teamAWins = 0;
        let teamBWins = 0;
        let played = 0;
        for (const m of md.matches) {
          const a = (m as any).team_a_score ?? 0;
          const b = (m as any).team_b_score ?? 0;
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
          clubName: (md.clubs as any)?.name ?? "",
          date: md.date,
          teamAWins,
          teamBWins,
          winner:
            teamAWins > teamBWins
              ? "Team A"
              : teamBWins > teamAWins
              ? "Team B"
              : "Draw",
        };
      }
      return null;
    },
    enabled: clubIds.length > 0,
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
      if (!userId || !playerId) return { eventsAttended: 0, gamesPlayed: 0 };

      const now = new Date();
      const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");

      // Events attended this month
      const { count: eventsAttended } = await supabase
        .from("event_rsvp")
        .select("id", { count: "exact", head: true })
        .eq("player_id", playerId)
        .eq("status", "attending")
        .gte("responded_at", monthStart)
        .lte("responded_at", monthEnd + "T23:59:59");

      // Games played this month
      const { count: gamesPlayed } = await supabase
        .from("game_players")
        .select("id, match_days!inner(date)", { count: "exact", head: true })
        .eq("player_id", playerId)
        .gte("match_days.date" as any, monthStart)
        .lte("match_days.date" as any, monthEnd);

      return {
        eventsAttended: eventsAttended ?? 0,
        gamesPlayed: gamesPlayed ?? 0,
      };
    },
    enabled: !!userId && !!playerId && clubIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

const HomeDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: playerId } = useCurrentPlayerId();
  const { data: clubs = [] } = useUserClubs(user?.id);
  const clubIds = clubs.map((c) => c.id).filter(Boolean) as string[];

  const { data: todaysEvent } = useTodaysEvents(user?.id, playerId);
  const { data: lastGame } = useLastGame(clubIds);
  const { data: monthlyStats } = useMonthlyStats(user?.id, playerId, clubIds);

  // Slider state
  const sliderRef = React.useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = React.useState(0);
  const totalSlides = 3;

  // Observe scroll position for dot indicators
  React.useEffect(() => {
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
  }, []);

  // Auto-rotate every 15s
  React.useEffect(() => {
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
  }, [totalSlides]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 pb-24">
        <div className="max-w-7xl mx-auto px-4 pt-6">
          {/* ─── Top Slider ──────────────────────────────────────── */}
          <div
            ref={sliderRef}
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              scrollPaddingInline: "1rem",
            }}
          >
            {/* Card 1 — Today's Game */}
            <div className="snap-start shrink-0 w-[85vw] sm:w-[340px] border border-border rounded-xl bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Volleyball className="h-5 w-5 text-primary" />
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Today's Game
                  </h3>
                </div>
                {todaysEvent?.currentUserRsvp === "attending" && (
                  <span className="flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" />
                    You're going
                  </span>
                )}
              </div>
              {todaysEvent ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {todaysEvent.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {todaysEvent.clubName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {todaysEvent.attendingCount} player
                    {todaysEvent.attendingCount !== 1 ? "s" : ""} attending
                  </div>
                  <Button
                    className="w-full"
                    onClick={() =>
                      todaysEvent.matchDayId
                        ? navigate(`/game/${todaysEvent.matchDayId}`)
                        : navigate(`/events/${todaysEvent.eventId}`)
                    }
                  >
                    {todaysEvent.matchDayId ? "View Game" : "Start Game"}
                  </Button>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-muted-foreground text-sm">
                    No game scheduled today
                  </p>
                </div>
              )}
            </div>

            {/* Card 2 — Last Game Played */}
            <div
              className={`snap-start shrink-0 w-[85vw] sm:w-[340px] border border-border rounded-xl bg-card p-5 ${
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
                    Last Game
                  </h3>
                </div>
                {lastGame && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    View
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
                    {format(parseISO(lastGame.date), "d MMM yyyy")}
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
                    {lastGame.winner === "Draw" ? (
                      <span className="text-muted-foreground">Draw</span>
                    ) : (
                      <>
                        <span className={`font-medium ${
                          lastGame.winner === "Team A"
                            ? "text-red-500"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}>
                          {lastGame.winner}
                        </span>{" "}
                        <span className={`font-medium ${
                          lastGame.winner === "Team A"
                            ? "text-red-500"
                            : "text-emerald-600 dark:text-emerald-400"
                        }`}>wins</span>
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-muted-foreground text-sm">
                    No games played yet
                  </p>
                </div>
              )}
            </div>

            {/* Card 3 — Monthly Stats */}
            <div className="snap-start shrink-0 w-[85vw] sm:w-[340px] border border-border rounded-xl bg-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  This Month
                </h3>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">
                    {monthlyStats?.eventsAttended ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Events Attended
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">
                    {monthlyStats?.gamesPlayed ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Games Played
                  </p>
                </div>
              </div>
            </div>

            {/* Trailing spacer */}
            <div className="shrink-0 w-1" aria-hidden="true" />
          </div>

          {/* Dot indicators */}
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

          {/* ─── Discover Events ──────────────────────────────────── */}
          <section className="mt-8">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Discover Events
            </h2>
            <div className="h-44 rounded-xl bg-muted/50 border border-border" />
          </section>
        </div>
      </main>
    </div>
  );
};

export default HomeDashboard;
