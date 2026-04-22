import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueries } from "@tanstack/react-query";
import {
  Users,
  Search,
  Grid3X3,
  List,
  SlidersHorizontal,
  ArrowUpDown,
  Settings,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MemberCard } from "@/components/members/MemberCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { useIsCompact } from "@/hooks/use-compact";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GlobalMember {
  player_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  image_url: string | null;
  skill_rating: number | null;
  member_association: boolean | null;
  player_positions: Array<{
    is_primary: boolean | null;
    positions: { name: string };
  }>;
  clubs: Array<{ id: string; name: string; slug: string; role: string }>;
}

type ViewMode = "grid" | "list";

// ─── Data fetching ────────────────────────────────────────────────────────────
async function fetchGlobalMembers(userId: string): Promise<GlobalMember[]> {
  const { data: myMemberships, error: myErr } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("status", "active");

  if (myErr) throw myErr;
  if (!myMemberships?.length) return [];

  const clubIds = myMemberships.map((m) => m.club_id).filter(Boolean) as string[];

  const { data: clubRows } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .in("id", clubIds);

  const clubById: Record<string, { name: string; slug: string }> = {};
  clubRows?.forEach((c) => {
    clubById[c.id] = { name: c.name, slug: c.slug };
  });

  const byPlayerId = new Map<string, GlobalMember>();

  await Promise.all(
    clubIds.map(async (clubId) => {
      const { data: members } = await supabase
        .from("club_members")
        .select("user_id, role, member_association")
        .eq("club_id", clubId)
        .eq("is_active", true)
        .eq("status", "active");

      if (!members?.length) return;

      const userIds = members
        .map((m) => m.user_id)
        .filter(Boolean) as string[];
      if (!userIds.length) return;

      const { data: players } = await supabase
        .from("players")
        .select(
          `id, user_id, first_name, last_name, image_url, skill_rating,
           player_positions(id, position_id, is_primary, positions(id, name))`
        )
        .in("user_id", userIds);

      const playerByUserId = new Map(
        (players ?? []).map((p) => [p.user_id, p])
      );

      for (const row of members) {
        if (!row.user_id) continue;
        const p = playerByUserId.get(row.user_id);
        if (!p) continue;

        const club = clubById[clubId];
        const clubEntry = {
          id: clubId,
          name: club?.name ?? "",
          slug: club?.slug ?? "",
          role: row.role ?? "member",
        };

        const existing = byPlayerId.get(p.id);
        if (existing) {
          if (!existing.clubs.some((c) => c.id === clubEntry.id)) {
            existing.clubs.push(clubEntry);
          }
        } else {
          byPlayerId.set(p.id, {
            player_id: p.id,
            user_id: p.user_id,
            first_name: p.first_name,
            last_name: p.last_name,
            image_url: p.image_url,
            skill_rating: p.skill_rating,
            member_association: row.member_association ?? null,
            player_positions: (p.player_positions ?? []) as GlobalMember["player_positions"],
            clubs: [clubEntry],
          });
        }
      }
    })
  );

  return Array.from(byPlayerId.values());
}

// ─── List item component ──────────────────────────────────────────────────────
const MemberListItem = ({ member }: { member: GlobalMember }) => {
  const primaryPosition =
    member.player_positions?.find((pos) => pos.is_primary)?.positions.name ||
    "No position";
  const lastNameInitial = member.last_name
    ? member.last_name.charAt(0).toUpperCase()
    : "";

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="w-10 h-10 bg-muted rounded-full overflow-hidden flex-shrink-0">
        {member.image_url ? (
          <img
            src={member.image_url}
            alt={`${member.first_name} ${member.last_name}`}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-semibold">
            {member.first_name?.[0]}
            {member.last_name?.[0]}
          </div>
        )}
      </div>
      <div className="flex-grow min-w-0">
        <h3 className="font-medium text-sm truncate">
          {member.first_name} {lastNameInitial}.
        </h3>
        <p className="text-muted-foreground text-xs truncate">
          {primaryPosition}
        </p>
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const MembersGlobal: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCompact = useIsCompact();
  const [search, setSearch] = useState("");
  const [viewMode, setViewModeRaw] = useState<ViewMode>(
    () => (localStorage.getItem("members-view-mode") as ViewMode) || "grid"
  );
  const setViewMode = (mode: ViewMode) => {
    setViewModeRaw(mode);
    localStorage.setItem("members-view-mode", mode);
  };
  const [sortAsc, setSortAsc] = useState(true);
  const [filterClub, setFilterClub] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members-global", user?.id],
    queryFn: () => fetchGlobalMembers(user!.id),
    enabled: !!user?.id,
    retry: 1,
  });

  // Derived: all clubs the user belongs to
  const clubs = useMemo(() => {
    const map = new Map<string, { name: string; slug: string }>();
    members.forEach((m) =>
      m.clubs.forEach((c) => {
        if (!map.has(c.id)) {
          map.set(c.id, { name: c.name, slug: c.slug });
        }
      })
    );
    return Array.from(map.entries()).map(([id, info]) => ({
      id,
      ...info,
    }));
  }, [members]);

  // Clubs where the *current user* is admin (look up their own membership row)
  const adminClubs = useMemo(() => {
    if (!user?.id) return [];
    const currentUserMember = members.find((m) => m.user_id === user.id);
    if (!currentUserMember) return [];
    return currentUserMember.clubs.filter((c) => c.role === "admin");
  }, [members, user?.id]);

  // Count pending requests across all admin clubs
  const pendingQueries = useQueries({
    queries: adminClubs.map((c) => ({
      queryKey: ["pendingRequestsCount", c.id],
      queryFn: async () => {
        const { count } = await supabase
          .from("club_members")
          .select("id", { count: "exact", head: true })
          .eq("club_id", c.id)
          .eq("status", "pending");
        return count ?? 0;
      },
      staleTime: 60_000,
      enabled: adminClubs.length > 0,
    })),
  });

  const totalPendingRequests = pendingQueries.reduce(
    (sum, q) => sum + ((q.data as number) ?? 0),
    0
  );

  // Filter + sort
  const filtered = useMemo(() => {
    let result = members;

    if (filterClub.size > 0) {
      result = result.filter((m) => m.clubs.some((c) => filterClub.has(c.id)));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (m) =>
          m.first_name.toLowerCase().includes(q) ||
          m.last_name.toLowerCase().includes(q)
      );
    }

    return [...result].sort((a, b) => {
      const cmp = a.first_name.localeCompare(b.first_name);
      return sortAsc ? cmp : -cmp;
    });
  }, [members, filterClub, search, sortAsc]);

  const toggleClubFilter = (clubId: string) => {
    setFilterClub((prev) => {
      const next = new Set(prev);
      if (next.has(clubId)) next.delete(clubId);
      else next.add(clubId);
      return next;
    });
  };

  const activeFilterCount = filterClub.size;

  const handleManageRequests = () => {
    navigate("/manage-requests");
  };

  // ── Loading state ──
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        {!isCompact && <Navbar />}
        <div className="flex-grow flex items-center justify-center">
          <div className="animate-spin h-7 w-7 rounded-full border-2 border-muted border-t-foreground" />
        </div>
      </div>
    );
  }

  // ── Empty state ──
  if (members.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        {!isCompact && <Navbar />}
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center pb-24">
          <Users className="h-12 w-12 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold">No members yet</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Members from all your clubs will appear here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Desktop ──
  if (!isCompact) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold">Members</h1>
              {adminClubs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManageRequests}
                  className="relative"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Requests
                  {totalPendingRequests > 0 && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                  )}
                </Button>
              )}
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Controls row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSortAsc((prev) => !prev)}
                  className="flex items-center justify-center h-8 w-8 border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                  aria-label={sortAsc ? "Sort Z to A" : "Sort A to Z"}
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </button>

                {clubs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Filter
                    {activeFilterCount > 0 && (
                      <span className="ml-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>
                )}
              </div>

              <div className="flex items-center border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "flex items-center justify-center px-2.5 py-1.5 transition-colors",
                    viewMode === "grid"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                  aria-label="Grid view"
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "flex items-center justify-center px-2.5 py-1.5 transition-colors",
                    viewMode === "list"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                  aria-label="List view"
                >
                  <List className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Members display */}
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground text-sm">
                No members match your search.
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {filtered.map((m) => (
                  <MemberCard
                    key={m.player_id}
                    member={{
                      id: m.player_id,
                      first_name: m.first_name,
                      last_name: m.last_name,
                      image_url: m.image_url,
                      player_positions: m.player_positions,
                    }}
                    isAdmin={false}
                    isCurrentUser={m.user_id === user?.id}
                  />
                ))}
              </div>
            ) : (
              <div>
                {filtered.map((m) => (
                  <MemberListItem key={m.player_id} member={m} />
                ))}
              </div>
            )}

            {filtered.length > 0 && (
              <p className="text-xs text-muted-foreground text-right mt-4">
                {filtered.length} member{filtered.length !== 1 ? "s" : ""}
                {filtered.length !== members.length
                  ? ` (filtered from ${members.length})`
                  : ""}
              </p>
            )}
          </div>
        </main>

        {/* Filter sheet */}
        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Filter by Club</SheetTitle>
              <SheetDescription>
                Select which clubs to show members from.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {clubs.map((club) => (
                <label
                  key={club.id}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <Checkbox
                    checked={filterClub.has(club.id)}
                    onCheckedChange={() => toggleClubFilter(club.id)}
                  />
                  <span className="text-sm font-medium">{club.name}</span>
                </label>
              ))}
              {filterClub.size > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilterClub(new Set())}
                  className="mt-2"
                >
                  Clear all
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // ── Mobile ──
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <div className="px-4 py-4 pb-24">
          {/* Headline + Manage Requests */}
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold">Members</h1>
            {adminClubs.length > 0 && (
              <button
                type="button"
                onClick={handleManageRequests}
                className="relative flex items-center gap-1.5 text-xs font-medium text-primary"
              >
                <Settings className="h-3.5 w-3.5" />
                Manage Requests
                {totalPendingRequests > 0 && (
                  <span className="absolute -top-1 -right-2 h-2.5 w-2.5 rounded-full bg-red-500" />
                )}
              </button>
            )}
          </div>

          {/* Search bar (in place of tab toggle) */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9"
            />
          </div>

          {/* Controls row — matches Home layout */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSortAsc((prev) => !prev)}
                className="flex items-center justify-center h-8 w-8 border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                aria-label={sortAsc ? "Sort Z to A" : "Sort A to Z"}
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>

              {clubs.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg text-muted-foreground hover:bg-muted transition-colors"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="ml-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* View toggle — icons only */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex items-center justify-center px-2.5 py-1.5 transition-colors",
                  viewMode === "grid"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
                aria-label="Grid view"
              >
                <Grid3X3 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex items-center justify-center px-2.5 py-1.5 transition-colors",
                  viewMode === "list"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
                aria-label="List view"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Members display */}
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              No members match your search.
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map((m) => (
                <MemberCard
                  key={m.player_id}
                  member={{
                    id: m.player_id,
                    first_name: m.first_name,
                    last_name: m.last_name,
                    image_url: m.image_url,
                    player_positions: m.player_positions,
                  }}
                  isAdmin={false}
                  isCurrentUser={m.user_id === user?.id}
                />
              ))}
            </div>
          ) : (
            <div>
              {filtered.map((m) => (
                <MemberListItem key={m.player_id} member={m} />
              ))}
            </div>
          )}

          {filtered.length > 0 && (
            <p className="text-xs text-muted-foreground text-right mt-4">
              {filtered.length} member{filtered.length !== 1 ? "s" : ""}
              {filtered.length !== members.length
                ? ` (filtered from ${members.length})`
                : ""}
            </p>
          )}
        </div>
      </main>

      {/* Filter sheet */}
      <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Filter by Club</SheetTitle>
            <SheetDescription>
              Select which clubs to show members from.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {clubs.map((club) => (
              <label
                key={club.id}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Checkbox
                  checked={filterClub.has(club.id)}
                  onCheckedChange={() => toggleClubFilter(club.id)}
                />
                <span className="text-sm font-medium">{club.name}</span>
              </label>
            ))}
            {filterClub.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterClub(new Set())}
                className="mt-2"
              >
                Clear all
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MembersGlobal;
