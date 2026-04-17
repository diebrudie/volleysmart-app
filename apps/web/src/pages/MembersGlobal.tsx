import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MemberCard } from "@/components/members/MemberCard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GlobalMember {
  player_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  image_url: string | null;
  skill_rating: number | null;
  country: string | null;
  member_association: boolean | null;
  player_positions: Array<{
    is_primary: boolean | null;
    positions: { name: string };
  }>;
  clubs: Array<{ id: string; name: string; role: string }>;
}

type SortKey =
  | "first_name_asc"
  | "first_name_desc"
  | "last_name_asc"
  | "last_name_desc"
  | "skill_desc"
  | "skill_asc";

// ─── Data fetching ────────────────────────────────────────────────────────────
async function fetchGlobalMembers(userId: string): Promise<GlobalMember[]> {
  // 1. Get all active club memberships for the current user
  const { data: myMemberships, error: myErr } = await supabase
    .from("club_members")
    .select("club_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (myErr) throw myErr;
  if (!myMemberships?.length) return [];

  const clubIds = myMemberships.map((m) => m.club_id).filter(Boolean) as string[];

  // 2. Fetch all active members across those clubs (with player info + positions)
  const { data: memberships, error: membErr } = await supabase
    .from("club_members")
    .select(
      `
      club_id,
      role,
      member_association,
      players (
        id,
        user_id,
        first_name,
        last_name,
        image_url,
        skill_rating,
        country,
        player_positions (
          is_primary,
          positions ( name )
        )
      )
    `
    )
    .in("club_id", clubIds)
    .eq("status", "active")
    .eq("is_active", true);

  if (membErr) throw membErr;

  // 3. Fetch club names for the IDs we have
  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, name")
    .in("id", clubIds);

  const clubNameById: Record<string, string> = {};
  clubs?.forEach((c) => {
    clubNameById[c.id] = c.name;
  });

  // 4. Deduplicate by player_id — merge club memberships
  const byPlayerId = new Map<string, GlobalMember>();

  for (const row of memberships ?? []) {
    const player = row.players;
    if (!player || Array.isArray(player)) continue;

    const p = player as {
      id: string;
      user_id: string | null;
      first_name: string;
      last_name: string;
      image_url: string | null;
      skill_rating: number | null;
      country: string | null;
      player_positions: Array<{
        is_primary: boolean | null;
        positions: { name: string };
      }>;
    };

    const existing = byPlayerId.get(p.id);
    const clubEntry = {
      id: row.club_id ?? "",
      name: clubNameById[row.club_id ?? ""] ?? "",
      role: row.role ?? "member",
    };

    if (existing) {
      existing.clubs.push(clubEntry);
    } else {
      byPlayerId.set(p.id, {
        player_id: p.id,
        user_id: p.user_id,
        first_name: p.first_name,
        last_name: p.last_name,
        image_url: p.image_url,
        skill_rating: p.skill_rating,
        country: p.country,
        member_association: row.member_association ?? null,
        player_positions: p.player_positions ?? [],
        clubs: [clubEntry],
      });
    }
  }

  return Array.from(byPlayerId.values());
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const MembersGlobal: React.FC = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterClub, setFilterClub] = useState("all");
  const [filterCountry, setFilterCountry] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("first_name_asc");

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members-global", user?.id],
    queryFn: () => fetchGlobalMembers(user!.id),
    enabled: !!user?.id,
  });

  // ── Derived filter options ──
  const clubs = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => m.clubs.forEach((c) => map.set(c.id, c.name)));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [members]);

  const countries = useMemo(() => {
    const set = new Set(members.map((m) => m.country).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [members]);

  // ── Filter + sort ──
  const filtered = useMemo(() => {
    let result = members;

    if (filterClub !== "all") {
      result = result.filter((m) => m.clubs.some((c) => c.id === filterClub));
    }
    if (filterCountry !== "all") {
      result = result.filter((m) => m.country === filterCountry);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (m) =>
          m.first_name.toLowerCase().includes(q) ||
          m.last_name.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case "first_name_asc":
          return a.first_name.localeCompare(b.first_name);
        case "first_name_desc":
          return b.first_name.localeCompare(a.first_name);
        case "last_name_asc":
          return a.last_name.localeCompare(b.last_name);
        case "last_name_desc":
          return b.last_name.localeCompare(a.last_name);
        case "skill_desc":
          return (b.skill_rating ?? 0) - (a.skill_rating ?? 0);
        case "skill_asc":
          return (a.skill_rating ?? 0) - (b.skill_rating ?? 0);
        default:
          return 0;
      }
    });

    return result;
  }, [members, filterClub, filterCountry, search, sortKey]);

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin h-7 w-7 rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }

  // ── Empty state ──
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-semibold">Members</h1>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 mb-6">
        {/* Club filter */}
        {clubs.length > 1 && (
          <Select value={filterClub} onValueChange={setFilterClub}>
            <SelectTrigger className="w-40">
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

        {/* Country filter */}
        {countries.length > 1 && (
          <Select value={filterCountry} onValueChange={setFilterCountry}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Countries" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {countries.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Sort */}
        <Select
          value={sortKey}
          onValueChange={(v) => setSortKey(v as SortKey)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="first_name_asc">
              <span className="flex items-center gap-1">
                First name <ChevronUp className="h-3 w-3" />
              </span>
            </SelectItem>
            <SelectItem value="first_name_desc">
              <span className="flex items-center gap-1">
                First name <ChevronDown className="h-3 w-3" />
              </span>
            </SelectItem>
            <SelectItem value="last_name_asc">
              <span className="flex items-center gap-1">
                Last name <ChevronUp className="h-3 w-3" />
              </span>
            </SelectItem>
            <SelectItem value="last_name_desc">
              <span className="flex items-center gap-1">
                Last name <ChevronDown className="h-3 w-3" />
              </span>
            </SelectItem>
            <SelectItem value="skill_desc">Skill (high → low)</SelectItem>
            <SelectItem value="skill_asc">Skill (low → high)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No members match your filters.
        </div>
      ) : (
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
      )}

      {/* Summary */}
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

export default MembersGlobal;
