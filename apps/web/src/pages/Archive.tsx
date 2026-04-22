import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Archive as ArchiveIcon,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { useIsCompact } from "@/hooks/use-compact";

// ─── Types ────────────────────────────────────────────────────────────────────
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
  title: string;
  event_type: string;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  friendly_game: "Friendly",
  social_game: "Social",
  training: "Training",
  tournament: "Tournament",
};

const EVENT_TYPE_CLASS: Record<string, string> = {
  friendly_game: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  social_game: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  training: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  tournament: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

type SortKey = "date" | "club_name" | "winner";
type SortDir = "ascending" | "descending";

// ─── Data fetching ────────────────────────────────────────────────────────────
async function fetchCrossClubArchive(userId: string): Promise<ArchiveRow[]> {
  // 1. Get all active club memberships
  const { data: memberships, error: membErr } = await supabase
    .from("club_members")
    .select("club_id, clubs(id, name)")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("status", "active");

  if (membErr) throw membErr;
  if (!memberships?.length) return [];

  const clubIds = memberships
    .map((m) => m.club_id)
    .filter(Boolean) as string[];

  const clubNameById: Record<string, string> = {};
  memberships.forEach((m) => {
    if (m.club_id && m.clubs && !Array.isArray(m.clubs)) {
      clubNameById[m.club_id] = (m.clubs as { name: string }).name;
    }
  });

  // 2. Fetch all match_days with their matches + location + planned_event metadata
  const { data: matchDays, error: mdErr } = await supabase
    .from("match_days")
    .select(
      `
      id,
      date,
      club_id,
      locations(name),
      matches(id, team_a_score, team_b_score),
      planned_events!planned_event_id(title, event_type)
    `
    )
    .in("club_id", clubIds)
    .order("date", { ascending: false });

  if (mdErr) throw mdErr;

  // 3. Process into rows — skip match days with no played games
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
      teamAWins > teamBWins
        ? "Team A"
        : teamBWins > teamAWins
        ? "Team B"
        : "Draw";

    const pe = md.planned_events as { title: string; event_type: string } | null;
    const title =
      pe?.title ??
      new Date(md.date).toLocaleDateString("en-US", { weekday: "long" }) +
        " Training";
    const eventType = pe?.event_type ?? "friendly_game";

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
      title,
      event_type: eventType,
    });
  }

  return rows;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

const WINNER_BADGE: Record<
  ArchiveRow["winner"],
  { label: string; className: string }
> = {
  "Team A": {
    label: "Team A",
    className: "bg-red-500/10 text-red-600 dark:text-red-400",
  },
  "Team B": {
    label: "Team B",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  Draw: {
    label: "Draw",
    className: "bg-muted text-muted-foreground",
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const Archive: React.FC = () => {
  const { user } = useAuth();
  const isCompact = useIsCompact();

  const [sortConfig, setSortConfig] = useState<{
    key: SortKey;
    direction: SortDir;
  }>({ key: "date", direction: "descending" });

  const [filterClub, setFilterClub] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterWinner, setFilterWinner] = useState("all");

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["archive-cross-club", user?.id],
    queryFn: () => fetchCrossClubArchive(user!.id),
    enabled: !!user?.id,
  });

  // ── Derived filter options ──
  const clubs = Array.from(
    new Map(rows.map((r) => [r.club_id, r.club_name])).entries()
  ).map(([id, name]) => ({ id, name }));

  const months = Array.from(
    new Set(
      rows.map((r) =>
        new Date(r.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        })
      )
    )
  ).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // ── Filter + sort ──
  const filtered = rows
    .filter((r) => filterClub === "all" || r.club_id === filterClub)
    .filter(
      (r) =>
        filterMonth === "all" ||
        new Date(r.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
        }) === filterMonth
    )
    .filter((r) => filterWinner === "all" || r.winner === filterWinner)
    .sort((a, b) => {
      const dir = sortConfig.direction === "ascending" ? 1 : -1;
      if (sortConfig.key === "date") {
        return (
          (new Date(a.date).getTime() - new Date(b.date).getTime()) * dir
        );
      }
      return a[sortConfig.key] < b[sortConfig.key]
        ? -1 * dir
        : a[sortConfig.key] > b[sortConfig.key]
        ? 1 * dir
        : 0;
    });

  const requestSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction:
        prev.key === key && prev.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortConfig.key === col ? (
      sortConfig.direction === "ascending" ? (
        <ChevronUp className="h-3.5 w-3.5 ml-1 inline" />
      ) : (
        <ChevronDown className="h-3.5 w-3.5 ml-1 inline" />
      )
    ) : (
      <ChevronDown className="h-3.5 w-3.5 ml-1 inline text-muted-foreground" />
    );

  const pageContent = () => {
    // ── Loading ──
    if (isLoading) {
      return (
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin h-7 w-7 rounded-full border-2 border-muted border-t-foreground" />
        </div>
      );
    }

    // ── Empty state ──
    if (rows.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center pb-24">
          <ArchiveIcon className="h-12 w-12 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold">No past events yet</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Completed events from all your clubs will appear here.
            </p>
          </div>
        </div>
      );
    }

    // ── Table ──
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 pb-24">
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Past Events</CardTitle>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              {/* Club filter — only show if more than 1 club */}
              {clubs.length > 1 && (
                <Select value={filterClub} onValueChange={setFilterClub}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="All Clubs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clubs</SelectItem>
                    {clubs.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {months.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterWinner} onValueChange={setFilterWinner}>
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
                  {/* Date + Title */}
                  <TableHead className="w-[200px]">
                    <button
                      className="flex items-center hover:text-foreground transition-colors"
                      onClick={() => requestSort("date")}
                    >
                      Date
                      <SortIcon col="date" />
                    </button>
                  </TableHead>

                  {/* Type */}
                  <TableHead className="hidden sm:table-cell">Type</TableHead>

                  {/* Club — visible if >1 club */}
                  {clubs.length > 1 && (
                    <TableHead>
                      <button
                        className="flex items-center hover:text-foreground transition-colors"
                        onClick={() => requestSort("club_name")}
                      >
                        Club
                        <SortIcon col="club_name" />
                      </button>
                    </TableHead>
                  )}

                  {/* Score */}
                  <TableHead className="text-center">Score</TableHead>

                  {/* Winner */}
                  <TableHead>
                    <button
                      className="flex items-center hover:text-foreground transition-colors"
                      onClick={() => requestSort("winner")}
                    >
                      Winner
                      <SortIcon col="winner" />
                    </button>
                  </TableHead>

                  {/* Location — desktop only */}
                  <TableHead className="hidden sm:table-cell">
                    Location
                  </TableHead>

                  {/* Details */}
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={clubs.length > 1 ? 7 : 6}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No events match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((row) => {
                    const badge = WINNER_BADGE[row.winner];
                    return (
                      <TableRow key={row.match_day_id}>
                        {/* Date + Title */}
                        <TableCell className="font-medium whitespace-nowrap">
                          <div>
                            <span className="sm:hidden">
                              {formatDateShort(row.date)}
                            </span>
                            <span className="hidden sm:inline">
                              {formatDate(row.date)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[180px]">
                            {row.title}
                          </div>
                        </TableCell>

                        {/* Type */}
                        <TableCell className="hidden sm:table-cell">
                          <Badge
                            className={`text-xs font-medium border-0 ${
                              EVENT_TYPE_CLASS[row.event_type] ?? "bg-muted text-muted-foreground"
                            }`}
                          >
                            {EVENT_TYPE_LABELS[row.event_type] ?? row.event_type}
                          </Badge>
                        </TableCell>

                        {/* Club */}
                        {clubs.length > 1 && (
                          <TableCell className="text-sm">
                            {row.club_name}
                          </TableCell>
                        )}

                        {/* Score */}
                        <TableCell className="text-center font-semibold tabular-nums">
                          {row.team_a_wins} – {row.team_b_wins}
                        </TableCell>

                        {/* Winner badge */}
                        <TableCell>
                          <Badge
                            className={`text-xs font-medium border-0 ${badge.className}`}
                          >
                            {badge.label}
                          </Badge>
                        </TableCell>

                        {/* Location */}
                        <TableCell className="hidden sm:table-cell">
                          {row.location_name ? (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              {row.location_name}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </TableCell>

                        {/* Details */}
                        <TableCell className="text-right">
                          <Link to={`/game/${row.match_day_id}`}>
                            <Button variant="action" size="sm">
                              Details
                            </Button>
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

      {/* Summary row */}
      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-right mt-2">
          {filtered.length} event{filtered.length !== 1 ? "s" : ""}
          {filtered.length !== rows.length ? ` (filtered from ${rows.length})` : ""}
        </p>
      )}
    </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {!isCompact && <Navbar />}
      <main className="flex-grow">{pageContent()}</main>
    </div>
  );
};

export default Archive;
