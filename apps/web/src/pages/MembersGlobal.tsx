import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Search,
  Grid3X3,
  List,
  Plus,
  SlidersHorizontal,
  ArrowUpDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { MemberCard } from "@/components/members/MemberCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { useIsCompact } from "@/hooks/use-compact";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { ClubInviteSharePanel } from "@/components/clubs/ClubInviteSharePanel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  // 1. Get the current user's active club memberships
  const { data: myMemberships, error: myErr } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (myErr) throw myErr;
  if (!myMemberships?.length) return [];

  const clubIds = myMemberships.map((m) => m.club_id).filter(Boolean) as string[];

  // 2. Fetch club names + slugs
  const { data: clubRows } = await supabase
    .from("clubs")
    .select("id, name, slug")
    .in("id", clubIds);

  const clubById: Record<string, { name: string; slug: string }> = {};
  clubRows?.forEach((c) => {
    clubById[c.id] = { name: c.name, slug: c.slug };
  });

  // 3. For each club, fetch members + players
  const byPlayerId = new Map<string, GlobalMember>();

  await Promise.all(
    clubIds.map(async (clubId) => {
      const { data: members } = await supabase
        .from("club_members")
        .select("user_id, role, member_association")
        .eq("club_id", clubId)
        .eq("is_active", true);

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
    <Card className="hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden flex-shrink-0">
            {member.image_url ? (
              <img
                src={member.image_url}
                alt={`${member.first_name} ${member.last_name}`}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  target.parentElement!.innerHTML = `
                    <div class="w-full h-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      <svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  `;
                }}
              />
            ) : (
              <img
                src="/avatar-placeholder.svg"
                alt={`${member.first_name} ${member.last_name}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  target.parentElement!.innerHTML = `
                    <div class="w-full h-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      <svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  `;
                }}
              />
            )}
          </div>
          <div className="flex-grow min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex-grow min-w-0">
                <h3 className="font-semibold text-lg truncate">
                  {member.first_name} {lastNameInitial}.
                </h3>
                <p className="text-muted-foreground text-sm font-medium truncate">
                  {primaryPosition}
                </p>
              </div>
              {member.member_association && (
                <div className="w-5 h-5 flex-shrink-0">
                  <img
                    src="/volleyball.svg"
                    alt="Association member"
                    className="w-full h-full"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.parentElement!.innerHTML = `
                        <div class="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                          <span class="text-white text-xs font-bold">V</span>
                        </div>
                      `;
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const MembersGlobal: React.FC = () => {
  const { user } = useAuth();
  const isCompact = useIsCompact();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortAsc, setSortAsc] = useState(true);
  const [filterClub, setFilterClub] = useState<Set<string>>(new Set());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedClubForInvite, setSelectedClubForInvite] = useState<string>("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members-global", user?.id],
    queryFn: () => fetchGlobalMembers(user!.id),
    enabled: !!user?.id,
    retry: 1,
  });

  // ── Derived filter options ──
  const clubs = useMemo(() => {
    const map = new Map<string, { name: string; slug: string }>();
    members.forEach((m) =>
      m.clubs.forEach((c) => map.set(c.id, { name: c.name, slug: c.slug }))
    );
    return Array.from(map.entries()).map(([id, info]) => ({
      id,
      name: info.name,
      slug: info.slug,
    }));
  }, [members]);

  // ── Filter + sort ──
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
      if (next.has(clubId)) {
        next.delete(clubId);
      } else {
        next.add(clubId);
      }
      return next;
    });
  };

  // Invite modal content
  const inviteContent = () => {
    if (clubs.length === 1) {
      return <ClubInviteSharePanel joinCode={clubs[0].slug} />;
    }

    const selectedClub = clubs.find((c) => c.id === selectedClubForInvite);

    return (
      <div className="flex flex-col gap-4">
        <Select
          value={selectedClubForInvite}
          onValueChange={setSelectedClubForInvite}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a club" />
          </SelectTrigger>
          <SelectContent>
            {clubs.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedClub && (
          <ClubInviteSharePanel joinCode={selectedClub.slug} />
        )}
      </div>
    );
  };

  const content = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin h-7 w-7 rounded-full border-2 border-muted border-t-foreground" />
        </div>
      );
    }

    if (members.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center pb-24">
          <Users className="h-12 w-12 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold">No members yet</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Members from all your clubs will appear here.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 pb-24">
        {/* Header */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h1 className="text-4xl font-serif">Members</h1>
          <Button
            onClick={() => {
              if (clubs.length === 1) setSelectedClubForInvite(clubs[0].id);
              setIsInviteOpen(true);
            }}
            variant="outline"
            className="self-start sm:self-end"
          >
            <Plus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </div>

        {/* Controls card */}
        <Card className="border border-gray-200 dark:border-gray-700 mb-6">
          <CardContent className="p-4">
            {/* Member count */}
            <div className="flex items-center mb-4">
              <Users className="w-5 h-5 mr-2 text-muted-foreground" />
              <span className="text-lg font-semibold">
                {filtered.length} Member{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Search + Sort + Filter + View toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {/* Search */}
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search members by name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center justify-end gap-2">
                {/* Sort toggle */}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortAsc((prev) => !prev)}
                  aria-label={sortAsc ? "Sort Z to A" : "Sort A to Z"}
                  className="h-9 w-9 shrink-0"
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>

                {/* Filter button */}
                {clubs.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsFilterOpen(true)}
                    className="relative shrink-0 h-9"
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filter
                    {filterClub.size > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-medium rounded-full bg-primary text-primary-foreground">
                        {filterClub.size}
                      </span>
                    )}
                  </Button>
                )}

                {/* View toggle */}
                <ToggleGroup
                  type="single"
                  value={viewMode}
                  onValueChange={(v) => {
                    if (v) setViewMode(v as ViewMode);
                  }}
                  className="shrink-0 grow-0 basis-auto w-auto h-auto items-center p-1"
                >
                  <ToggleGroupItem value="grid" aria-label="Grid view" size="sm" className="h-7 w-7 p-0">
                    <Grid3X3 className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="list" aria-label="List view" size="sm" className="h-7 w-7 p-0">
                    <List className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members display */}
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No members match your filters.
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
                  member_association: m.member_association ?? undefined,
                  player_positions: m.player_positions,
                }}
                isAdmin={false}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
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
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {!isCompact && <Navbar />}
      <main className="flex-grow">{content()}</main>

      {/* Filter sheet (right drawer) */}
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

      {/* Invite modal — Drawer on mobile, Dialog on desktop */}
      {isCompact ? (
        <Drawer open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DrawerContent className="pb-6">
            <DrawerHeader className="text-left">
              <DrawerTitle>Invite your teammates</DrawerTitle>
              <DrawerDescription>
                Share your Club ID so they can join.
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pt-2 pb-2">{inviteContent()}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="mb-4 mt-4 text-center">
              <DialogTitle>Invite your teammates</DialogTitle>
              <DialogDescription className="mt-1">
                Share your Club ID so they can join.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center">{inviteContent()}</div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MembersGlobal;
