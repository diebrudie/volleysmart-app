import * as React from "react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  MapPin,
  Archive as ArchiveIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchUpcomingEvents,
  upsertRsvp,
  type PlannedEvent,
  type RsvpStatus,
} from "@/integrations/supabase/plannedEvents";
import { EventCard } from "@/components/events/EventCard";
import { useIsCompact } from "@/hooks/use-compact";
import Navbar from "@/components/layout/Navbar";

// ─── Archive types + helpers (Past Events tab) ────────────────────────────────
interface ArchiveRow {
  match_day_id: string;
  date: string;
  club_id: string;
  club_name: string;
  team_a_wins: number;
  team_b_wins: number;
  total_games_played: number;
  winner: "Team A" | "Team B" | "Draw";
  location_name: string | null;
}

type ArchiveSortKey = "date" | "club_name" | "winner";
type ArchiveSortDir = "ascending" | "descending";

async function fetchCrossClubArchive(userId: string): Promise<ArchiveRow[]> {
  const { data: memberships, error: membErr } = await supabase
    .from("club_members")
    .select("club_id, clubs(id, name)")
    .eq("user_id", userId)
    .eq("status", "active");

  if (membErr) throw membErr;
  if (!memberships?.length) return [];

  const clubIds = memberships.map((m) => m.club_id).filter(Boolean) as string[];

  const clubNameById: Record<string, string> = {};
  memberships.forEach((m) => {
    if (m.club_id && m.clubs && !Array.isArray(m.clubs)) {
      clubNameById[m.club_id] = (m.clubs as { name: string }).name;
    }
  });

  const { data: matchDays, error: mdErr } = await supabase
    .from("match_days")
    .select(`id, date, club_id, locations(name), matches(id, team_a_score, team_b_score)`)
    .in("club_id", clubIds)
    .order("date", { ascending: false });

  if (mdErr) throw mdErr;

  const rows: ArchiveRow[] = [];

  for (const md of matchDays ?? []) {
    if (!md.matches?.length) continue;

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

    const winner: ArchiveRow["winner"] =
      teamAWins > teamBWins ? "Team A" : teamBWins > teamAWins ? "Team B" : "Draw";

    rows.push({
      match_day_id: md.id,
      date: md.date,
      club_id: md.club_id ?? "",
      club_name: clubNameById[md.club_id ?? ""] ?? "—",
      team_a_wins: teamAWins,
      team_b_wins: teamBWins,
      total_games_played: played,
      winner,
      location_name:
        md.locations && !Array.isArray(md.locations)
          ? (md.locations as { name: string }).name
          : null,
    });
  }

  return rows;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateShort(dateStr: string) {
  const d = new Date(dateStr);
  return `${new Intl.DateTimeFormat("en-US", { month: "short" }).format(d)}. ${d.getDate()}, ${d.getFullYear()}`;
}

const WINNER_BADGE: Record<ArchiveRow["winner"], { label: string; className: string }> = {
  "Team A": { label: "Team A", className: "bg-red-500/10 text-red-600 dark:text-red-400" },
  "Team B": { label: "Team B", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  Draw: { label: "Draw", className: "bg-muted text-muted-foreground" },
};

// ─── User profile chip ────────────────────────────────────────────────────────
const UserChip: React.FC<{ userId: string }> = ({ userId }) => {
  const [profile, setProfile] = React.useState<{
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
    skill_rating?: number | null;
  } | null>(null);

  React.useEffect(() => {
    let active = true;
    supabase
      .from("players")
      .select("first_name, last_name, image_url, skill_rating")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setProfile(data);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (!profile) return null;

  const initials = [profile.first_name?.[0], profile.last_name?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
        {profile.image_url ? (
          <img src={profile.image_url} alt="Avatar" className="h-full w-full object-cover" />
        ) : (
          <span className="text-sm font-semibold">{initials || "?"}</span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium leading-none">
          {[profile.first_name, profile.last_name].filter(Boolean).join(" ")}
        </p>
        {profile.skill_rating != null && (
          <p className="text-xs text-muted-foreground mt-0.5">Level {profile.skill_rating}</p>
        )}
      </div>
    </div>
  );
};

// ─── Mini calendar ────────────────────────────────────────────────────────────
interface MiniCalendarProps {
  events: PlannedEvent[];
  month: Date;
  onMonthChange: (d: Date) => void;
  selectedDay: Date | null;
  onDaySelect: (d: Date) => void;
}

const MiniCalendar: React.FC<MiniCalendarProps> = ({
  events,
  month,
  onMonthChange,
  selectedDay,
  onDaySelect,
}) => {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });
  const eventDates = new Set(events.map((e) => e.date));

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => onMonthChange(subMonths(month, 1))}
          className="p-1 rounded hover:bg-muted"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium">{format(month, "MMMM yyyy")}</span>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, 1))}
          className="p-1 rounded hover:bg-muted"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div
            key={i}
            className="text-center text-[10px] font-medium text-muted-foreground py-1"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const hasEvent = eventDates.has(dateStr);
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
          const isCurrentMonth = day.getMonth() === month.getMonth();
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onDaySelect(day)}
              className={cn(
                "relative flex flex-col items-center justify-center h-9 w-full rounded-lg text-xs transition-colors",
                !isCurrentMonth && "opacity-30",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : isToday
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-muted"
              )}
            >
              {day.getDate()}
              {hasEvent && (
                <span
                  className={cn(
                    "absolute bottom-1 h-1 w-1 rounded-full",
                    isSelected ? "bg-primary-foreground" : "bg-primary"
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Event list ───────────────────────────────────────────────────────────────
const EventList: React.FC<{
  events: PlannedEvent[];
  isLoading: boolean;
  playerId: string | null;
  onRsvp: (eventId: string, status: RsvpStatus) => void;
  rsvpLoading: boolean;
  onCreateEvent: () => void;
}> = ({ events, isLoading, playerId, onRsvp, rsvpLoading, onCreateEvent }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-6 w-6 rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <CalendarDays className="h-12 w-12 text-muted-foreground" />
        <div>
          <p className="font-medium">No upcoming events</p>
          <p className="text-sm text-muted-foreground mt-1">Create one to get started</p>
        </div>
        <Button size="sm" onClick={onCreateEvent}>
          <Plus className="h-4 w-4 mr-1.5" />
          Create Event
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          playerId={playerId}
          onRsvp={onRsvp}
          rsvpLoading={rsvpLoading}
        />
      ))}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────
const UpcomingEvents: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isCompact = useIsCompact();

  // ── Tab state ──
  const [activeTab, setActiveTab] = React.useState<"upcoming" | "past">("upcoming");

  // ── Upcoming tab state ──
  const [view, setView] = React.useState<"list" | "calendar">("list");
  const [calendarMonth, setCalendarMonth] = React.useState(new Date());
  const [selectedDay, setSelectedDay] = React.useState<Date | null>(null);
  const [rsvpFilter, setRsvpFilter] = React.useState<"all" | "attending" | "maybe" | "declined" | "none">("all");

  // ── Past Events tab state ──
  const [archiveSortConfig, setArchiveSortConfig] = React.useState<{
    key: ArchiveSortKey;
    direction: ArchiveSortDir;
  }>({ key: "date", direction: "descending" });
  const [archiveFilterClub, setArchiveFilterClub] = React.useState("all");
  const [archiveFilterMonth, setArchiveFilterMonth] = React.useState("all");
  const [archiveFilterWinner, setArchiveFilterWinner] = React.useState("all");

  // ── Queries ──
  const { data: playerId } = useQuery({
    queryKey: ["my-player-id", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      return data?.id ?? null;
    },
    enabled: !!user?.id,
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["upcoming-events", user?.id],
    queryFn: () => fetchUpcomingEvents(user!.id),
    enabled: !!user?.id,
  });

  const { data: archiveRows = [], isLoading: archiveLoading } = useQuery({
    queryKey: ["archive-cross-club", user?.id],
    queryFn: () => fetchCrossClubArchive(user!.id),
    enabled: !!user?.id && activeTab === "past",
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: RsvpStatus }) =>
      upsertRsvp(eventId, playerId!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["upcoming-events"] });
    },
  });

  // ── Upcoming derived ──
  const visibleEvents: PlannedEvent[] = React.useMemo(() => {
    let list =
      view === "calendar" && selectedDay
        ? events.filter((e) => e.date === format(selectedDay, "yyyy-MM-dd"))
        : events;

    if (rsvpFilter !== "all" && playerId) {
      list = list.filter((e) => {
        const myStatus = e.event_rsvp?.find((r) => r.player_id === playerId)?.status ?? null;
        if (rsvpFilter === "none") return myStatus === null;
        return myStatus === rsvpFilter;
      });
    }

    return list;
  }, [events, view, selectedDay, rsvpFilter, playerId]);

  // ── Archive derived ──
  const archiveClubs = React.useMemo(
    () =>
      Array.from(new Map(archiveRows.map((r) => [r.club_id, r.club_name])).entries()).map(
        ([id, name]) => ({ id, name })
      ),
    [archiveRows]
  );

  const archiveMonths = React.useMemo(
    () =>
      Array.from(
        new Set(
          archiveRows.map((r) =>
            new Date(r.date).toLocaleDateString("en-US", { year: "numeric", month: "long" })
          )
        )
      ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()),
    [archiveRows]
  );

  const archiveFiltered = React.useMemo(() => {
    return archiveRows
      .filter((r) => archiveFilterClub === "all" || r.club_id === archiveFilterClub)
      .filter(
        (r) =>
          archiveFilterMonth === "all" ||
          new Date(r.date).toLocaleDateString("en-US", { year: "numeric", month: "long" }) ===
            archiveFilterMonth
      )
      .filter((r) => archiveFilterWinner === "all" || r.winner === archiveFilterWinner)
      .sort((a, b) => {
        const dir = archiveSortConfig.direction === "ascending" ? 1 : -1;
        if (archiveSortConfig.key === "date") {
          return (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir;
        }
        return a[archiveSortConfig.key] < b[archiveSortConfig.key]
          ? -1 * dir
          : a[archiveSortConfig.key] > b[archiveSortConfig.key]
          ? 1 * dir
          : 0;
      });
  }, [archiveRows, archiveFilterClub, archiveFilterMonth, archiveFilterWinner, archiveSortConfig]);

  // ── Handlers ──
  const handleRsvp = (eventId: string, status: RsvpStatus) => {
    if (!playerId) return;
    rsvpMutation.mutate({ eventId, status });
  };

  const handleDaySelect = (day: Date) =>
    setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day));

  const requestArchiveSort = (key: ArchiveSortKey) => {
    setArchiveSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "ascending" ? "descending" : "ascending",
    }));
  };

  // ── Shared UI pieces ───────────────────────────────────────────────────────

  const TabBar = () => (
    <div className="flex gap-1 mb-4">
      {(["upcoming", "past"] as const).map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => setActiveTab(tab)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium border transition-colors",
            activeTab === tab
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          {tab === "upcoming" ? "Upcoming" : "Past Events"}
        </button>
      ))}
    </div>
  );

  const RsvpFilterBar = () => (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {(
        [
          { key: "all", label: "All" },
          { key: "attending", label: "Going" },
          { key: "maybe", label: "Maybe" },
          { key: "declined", label: "Can't go" },
          { key: "none", label: "Not responded" },
        ] as const
      ).map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => setRsvpFilter(key)}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
            rsvpFilter === key
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const ArchiveSortIcon = ({ col }: { col: ArchiveSortKey }) =>
    archiveSortConfig.key === col ? (
      archiveSortConfig.direction === "ascending" ? (
        <ChevronUp className="h-3.5 w-3.5 ml-1 inline" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5 ml-1 inline" />
      )
    ) : (
      <ChevronDown className="h-3.5 w-3.5 ml-1 inline text-muted-foreground" />
    );

  const PastEventsContent = () => {
    if (archiveLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-6 w-6 rounded-full border-2 border-muted border-t-foreground" />
        </div>
      );
    }

    if (archiveRows.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <ArchiveIcon className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="font-medium">No games yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Completed games from all your clubs will appear here.
            </p>
          </div>
        </div>
      );
    }

    return (
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Games Archive</CardTitle>
            <div className="flex flex-wrap gap-2">
              {archiveClubs.length > 1 && (
                <Select value={archiveFilterClub} onValueChange={setArchiveFilterClub}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All Clubs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clubs</SelectItem>
                    {archiveClubs.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={archiveFilterMonth} onValueChange={setArchiveFilterMonth}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {archiveMonths.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={archiveFilterWinner} onValueChange={setArchiveFilterWinner}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All Winners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Winners</SelectItem>
                  <SelectItem value="Team A">Team A</SelectItem>
                  <SelectItem value="Team B">Team B</SelectItem>
                  <SelectItem value="Draw">Draw</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">
                    <button
                      className="flex items-center hover:text-foreground transition-colors"
                      onClick={() => requestArchiveSort("date")}
                    >
                      Date <ArchiveSortIcon col="date" />
                    </button>
                  </TableHead>
                  {archiveClubs.length > 1 && (
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground transition-colors"
                        onClick={() => requestArchiveSort("club_name")}
                      >
                        Club <ArchiveSortIcon col="club_name" />
                      </button>
                    </TableHead>
                  )}
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead>
                    <button
                      className="flex items-center hover:text-foreground transition-colors"
                      onClick={() => requestArchiveSort("winner")}
                    >
                      Winner <ArchiveSortIcon col="winner" />
                    </button>
                  </TableHead>
                  <TableHead className="hidden sm:table-cell">Location</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archiveFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={archiveClubs.length > 1 ? 6 : 5}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No games match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  archiveFiltered.map((row) => {
                    const badge = WINNER_BADGE[row.winner];
                    return (
                      <TableRow key={row.match_day_id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          <span className="sm:hidden">{formatDateShort(row.date)}</span>
                          <span className="hidden sm:inline">{formatDate(row.date)}</span>
                        </TableCell>
                        {archiveClubs.length > 1 && (
                          <TableCell className="text-sm">{row.club_name}</TableCell>
                        )}
                        <TableCell className="text-center font-semibold tabular-nums">
                          {row.team_a_wins} – {row.team_b_wins}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs font-medium border-0 ${badge.className}`}>
                            {badge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {row.location_name ? (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              {row.location_name}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link to={`/game-details/${row.match_day_id}`}>
                            <Button variant="action" size="sm">Details</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ── Desktop layout ─────────────────────────────────────────────────────────
  if (!isCompact) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              {user?.id && <UserChip userId={user.id} />}
              <Button onClick={() => navigate("/events/new")} size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Create Event
              </Button>
            </div>

            <TabBar />

            {activeTab === "upcoming" ? (
              <div className="flex gap-8">
                <aside className="w-64 shrink-0">
                  <div className="rounded-2xl border bg-card p-4 sticky top-20">
                    <MiniCalendar
                      events={events}
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      selectedDay={selectedDay}
                      onDaySelect={handleDaySelect}
                    />
                    {selectedDay && (
                      <button
                        type="button"
                        onClick={() => setSelectedDay(null)}
                        className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear filter
                      </button>
                    )}
                  </div>
                </aside>

                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-semibold mb-4">
                    {selectedDay ? `Events on ${format(selectedDay, "MMMM d")}` : "Upcoming Events"}
                  </h1>
                  <RsvpFilterBar />
                  <EventList
                    events={visibleEvents}
                    isLoading={isLoading}
                    playerId={playerId ?? null}
                    onRsvp={handleRsvp}
                    rsvpLoading={rsvpMutation.isPending}
                    onCreateEvent={() => navigate("/events/new")}
                  />
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-xl font-semibold mb-4">Past Events</h1>
                <PastEventsContent />
                {archiveFiltered.length > 0 && (
                  <p className="text-xs text-muted-foreground text-right mt-2">
                    {archiveFiltered.length} game{archiveFiltered.length !== 1 ? "s" : ""}
                    {archiveFiltered.length !== archiveRows.length
                      ? ` (filtered from ${archiveRows.length})`
                      : ""}
                  </p>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── Mobile / tablet ────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-4 pb-24">
      <div className="flex items-center justify-between mb-4">
        {user?.id && <UserChip userId={user.id} />}
        {activeTab === "upcoming" && (
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setView("list")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setView("calendar")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors",
                view === "calendar"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Calendar
            </button>
          </div>
        )}
      </div>

      <TabBar />

      {activeTab === "upcoming" ? (
        <>
          {view === "calendar" && (
            <div className="rounded-2xl border bg-card p-4 mb-4">
              <MiniCalendar
                events={events}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                selectedDay={selectedDay}
                onDaySelect={handleDaySelect}
              />
              {selectedDay && (
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="mt-2 w-full text-xs text-muted-foreground"
                >
                  Show all events
                </button>
              )}
            </div>
          )}

          <h1 className="text-lg font-semibold mb-3">
            {view === "calendar" && selectedDay
              ? `Events on ${format(selectedDay, "MMMM d")}`
              : "Upcoming Events"}
          </h1>

          <RsvpFilterBar />

          <EventList
            events={visibleEvents}
            isLoading={isLoading}
            playerId={playerId ?? null}
            onRsvp={handleRsvp}
            rsvpLoading={rsvpMutation.isPending}
            onCreateEvent={() => navigate("/events/new")}
          />
        </>
      ) : (
        <>
          <h1 className="text-lg font-semibold mb-3">Past Events</h1>
          <PastEventsContent />
          {archiveFiltered.length > 0 && (
            <p className="text-xs text-muted-foreground text-right mt-2">
              {archiveFiltered.length} game{archiveFiltered.length !== 1 ? "s" : ""}
              {archiveFiltered.length !== archiveRows.length
                ? ` (filtered from ${archiveRows.length})`
                : ""}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default UpcomingEvents;
