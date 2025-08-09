import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { useClub } from "@/contexts/ClubContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { Spinner } from "@/components/ui/spinner";
import { MemberCard } from "@/components/members/MemberCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Grid3X3, List, Users, Plus, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

// Simple types to avoid complex Supabase type inference
interface ClubMember {
  club_id: string;
  id: string;
  joined_at: string;
  user_id: string;
  is_active: boolean;
}

interface Player {
  id: string;
  first_name: string;
  last_name: string;
  image_url: string | null;
  user_id: string;
  member_association: boolean;
  player_positions: Array<{
    is_primary: boolean | null;
    positions: {
      name: string;
    };
  }>;
}

interface MemberWithPlayer {
  member: ClubMember;
  player: Player | null;
}

type SortOption =
  | "first_name_asc"
  | "first_name_desc"
  | "last_name_asc"
  | "last_name_desc";
type ViewMode = "grid" | "list";

const Members = () => {
  console.log(
    "👥 Members component rendering, current URL:",
    window.location.pathname
  );

  const { clubId: urlClubId } = useParams<{ clubId: string }>();
  const { clubId: contextClubId, setClubId } = useClub();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Local state for new features
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("first_name_asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use URL clubId first, fallback to context
  const clubId = urlClubId || contextClubId;

  // Set context from URL if available
  useEffect(() => {
    if (urlClubId && urlClubId !== contextClubId) {
      setClubId(urlClubId);
    }
  }, [urlClubId, contextClubId, setClubId]);

  // Query to fetch club members (keeping your existing logic)
  const {
    data: members,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["clubMembers", clubId],
    queryFn: async (): Promise<MemberWithPlayer[]> => {
      if (!clubId) {
        console.log("❌ No clubId in queryFn");
        return [];
      }

      try {
        // Step 1: Get club members for the specific club
        const { data: clubMembersRaw, error: membersError } = await supabase
          .from("club_members")
          .select("club_id, id, joined_at, user_id, is_active")
          .eq("club_id", clubId)
          .eq("is_active", true);

        if (membersError) {
          console.error("❌ Error fetching club members:", membersError);
          throw membersError;
        }

        if (!clubMembersRaw || clubMembersRaw.length === 0) {
          console.log("⚠️ No members found for club:", clubId);
          return [];
        }

        // Cast to our simple type
        const clubMembers = clubMembersRaw as ClubMember[];

        // Step 2: Get user IDs and fetch corresponding players
        const userIds = clubMembers
          .map((member) => member.user_id)
          .filter(Boolean);

        const { data: playersRaw, error: playersError } = await supabase
          .from("players")
          .select(
            `
              id,
              first_name,
              last_name,
              image_url,
              user_id,
              member_association,
              player_positions (
                is_primary,
                positions (
                  name
                )
              )
            `
          )
          .in("user_id", userIds);

        if (playersError) {
          console.error("❌ Error fetching players:", playersError);
        }

        // Cast to our simple type
        const players = (playersRaw || []) as Player[];

        // Step 3: Combine data
        const result: MemberWithPlayer[] = clubMembers.map((member) => ({
          member,
          player:
            players.find((player) => player.user_id === member.user_id) || null,
        }));

        return result;
      } catch (error) {
        console.error("❌ Unexpected error in query:", error);
        throw error;
      }
    },
    enabled: !!clubId,
  });

  // Handle invite submission
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both name and email",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get club information to include in the invitation
      const { data: clubData, error: clubError } = await supabase
        .from("clubs")
        .select("name, slug")
        .eq("id", clubId)
        .single();

      if (clubError) throw clubError;

      // Call edge function to send invitation email
      const response = await fetch(
        `https://hdorkmnfwpegvlxygfwv.supabase.co/functions/v1/send-club-invitations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${
              (
                await supabase.auth.getSession()
              ).data.session?.access_token
            }`,
          },
          body: JSON.stringify({
            invites: [{ name: inviteName.trim(), email: inviteEmail.trim() }],
            clubInfo: {
              id: clubId,
              name: clubData.name,
              joinCode: clubData.slug,
            },
          }),
        }
      );

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to send invitation");
        } else {
          throw new Error(
            `Failed to send invitation: ${response.status} ${response.statusText}`
          );
        }
      }

      toast({
        title: "Invitation sent!",
        description: `Invitation has been sent to ${inviteEmail}`,
      });

      // Reset form and close modal
      setInviteName("");
      setInviteEmail("");
      setIsInviteModalOpen(false);

      // Refresh members list
      refetch();
    } catch (error: unknown) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when modal closes
  const handleModalClose = () => {
    setIsInviteModalOpen(false);
    setInviteName("");
    setInviteEmail("");
  };

  // Filtered and sorted members using useMemo for performance
  const processedMembers = useMemo(() => {
    if (!members) return [];

    // Filter members with player data first
    let filteredMembers = members.filter((memberData) => memberData.player);

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filteredMembers = filteredMembers.filter((memberData) => {
        const player = memberData.player!;
        const fullName =
          `${player.first_name} ${player.last_name}`.toLowerCase();

        return (
          fullName.includes(searchLower) ||
          player.first_name.toLowerCase().includes(searchLower) ||
          player.last_name.toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply sorting
    filteredMembers.sort((a, b) => {
      const playerA = a.player!;
      const playerB = b.player!;

      switch (sortBy) {
        case "first_name_asc":
          return playerA.first_name
            .toLowerCase()
            .localeCompare(playerB.first_name.toLowerCase());
        case "first_name_desc":
          return playerB.first_name
            .toLowerCase()
            .localeCompare(playerA.first_name.toLowerCase());
        case "last_name_asc":
          return playerA.last_name
            .toLowerCase()
            .localeCompare(playerB.last_name.toLowerCase());
        case "last_name_desc":
          return playerB.last_name
            .toLowerCase()
            .localeCompare(playerA.last_name.toLowerCase());
        default:
          return 0;
      }
    });

    return filteredMembers;
  }, [members, searchTerm, sortBy]);

  // Members without player profiles (for the end section)
  const membersWithoutProfiles = useMemo(() => {
    return members?.filter((memberData) => !memberData.player) || [];
  }, [members]);

  // List view component that matches your MemberCard styling
  const MemberListItem = ({ memberData }: { memberData: MemberWithPlayer }) => {
    const player = memberData.player!;

    // Get primary position (matching your MemberCard logic)
    const primaryPosition =
      player.player_positions?.find((pos) => pos.is_primary)?.positions.name ||
      "No position";

    // Get last name initial (matching your MemberCard logic)
    const lastNameInitial = player.last_name
      ? player.last_name.charAt(0).toUpperCase()
      : "";

    return (
      <Link to={`/players/${player.id}`}>
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              {/* Avatar */}
              <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                {player.image_url ? (
                  <img
                    src={player.image_url}
                    alt={`${player.first_name} ${player.last_name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src="/avatar-placeholder.svg"
                    alt={`${player.first_name} ${player.last_name}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.parentElement!.innerHTML = `
                        <div class="w-full h-full bg-gray-300 flex items-center justify-center">
                          <svg class="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />
                          </svg>
                        </div>
                      `;
                    }}
                  />
                )}
              </div>

              {/* Member Info */}
              <div className="flex-grow">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {player.first_name} {lastNameInitial}.
                    </h3>
                    <p className="text-gray-600 text-sm font-medium">
                      {primaryPosition}
                    </p>
                  </div>

                  {/* Volleyball Badge and Join Date */}
                  <div className="flex items-center space-x-3">
                    <div className="text-right text-sm text-gray-500">
                      <p className="text-xs">
                        Joined:{" "}
                        {new Date(
                          memberData.member.joined_at
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    {player.member_association && (
                      <div className="w-5 h-5 flex-shrink-0">
                        <img
                          src="/volleyball.svg"
                          alt="Club member"
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
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  if (error) {
    console.error("❌ Query error:", error);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header with Title and Invite Button */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-serif">Club's Members</h1>

            {/* Invite Member Modal */}
            <Dialog
              open={isInviteModalOpen}
              onOpenChange={setIsInviteModalOpen}
            >
              <DialogTrigger asChild>
                <Button variant="action" icon={<Plus className="h-4 w-4" />}>
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="mb-4">Invite New Member</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="member-name"
                      className="block text-sm font-medium mb-2"
                    >
                      Name
                    </label>
                    <Input
                      id="member-name"
                      placeholder="Maxi"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="member-email"
                      className="block text-sm font-medium mb-2"
                    >
                      Email Address
                    </label>
                    <Input
                      id="member-email"
                      type="email"
                      placeholder="maxi.mustermann@email.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-[#243F8D] hover:bg-[#1e3470]"
                    >
                      {isSubmitting ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" />
                          Sending...
                        </>
                      ) : (
                        "Send Invitation"
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Table Container */}
          <Card className="border border-gray-200">
            <CardContent className="p-6">
              {/* All Controls in One Row */}
              <div className="mb-6">
                {/* Desktop Layout - All in one row */}
                <div className="hidden sm:flex items-center gap-4">
                  {/* Member Count - Left side */}
                  <div className="flex items-center flex-shrink-0">
                    <Users className="w-5 h-5 mr-2 text-gray-600" />
                    <span className="text-lg font-semibold">
                      {members?.length || 0} Members
                    </span>
                  </div>

                  {/* Spacer to push everything to the right */}
                  <div className="flex-grow"></div>

                  {/* Search, Sort and View Controls - Right side */}
                  <div className="flex items-center gap-4">
                    {/* Search */}
                    <div className="relative w-80">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search members by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-full"
                      />
                    </div>

                    {/* Sort By */}
                    <Select
                      value={sortBy}
                      onValueChange={(value: SortOption) => setSortBy(value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first_name_asc">
                          First Name A-Z
                        </SelectItem>
                        <SelectItem value="first_name_desc">
                          First Name Z-A
                        </SelectItem>
                        <SelectItem value="last_name_asc">
                          Last Name A-Z
                        </SelectItem>
                        <SelectItem value="last_name_desc">
                          Last Name Z-A
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* View Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                      <Button
                        variant={viewMode === "grid" ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="px-3 py-2"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "primary" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="px-3 py-2"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Mobile Layout - Stacked */}
                <div className="sm:hidden space-y-4">
                  {/* Member Count */}
                  <div className="flex items-center">
                    <Users className="w-5 h-5 mr-2 text-gray-600" />
                    <span className="text-lg font-semibold">
                      {members?.length || 0} Members
                    </span>
                  </div>

                  {/* Search - Full width */}
                  <div className="relative w-full">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search members by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-full"
                    />
                  </div>

                  {/* Sort and View Controls - Same row, taking available space */}
                  <div className="flex items-center gap-2">
                    {/* Sort By - Takes available space */}
                    <Select
                      value={sortBy}
                      onValueChange={(value: SortOption) => setSortBy(value)}
                    >
                      <SelectTrigger className="flex-grow">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first_name_asc">
                          First Name A-Z
                        </SelectItem>
                        <SelectItem value="first_name_desc">
                          First Name Z-A
                        </SelectItem>
                        <SelectItem value="last_name_asc">
                          Last Name A-Z
                        </SelectItem>
                        <SelectItem value="last_name_desc">
                          Last Name Z-A
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    {/* View Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1 flex-shrink-0">
                      <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="px-3 py-2"
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="px-3 py-2"
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Members Display */}
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {processedMembers.map((memberData) => (
                    <MemberCard
                      key={memberData.member.user_id}
                      member={memberData.player!}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {processedMembers.map((memberData) => (
                    <MemberListItem
                      key={memberData.member.user_id}
                      memberData={memberData}
                    />
                  ))}
                </div>
              )}

              {/* Empty state */}
              {processedMembers.length === 0 &&
                members &&
                members.length > 0 && (
                  <div className="text-center py-12">
                    <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500 text-lg">
                      No members found matching "{searchTerm}"
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setSearchTerm("")}
                      className="mt-4"
                    >
                      Clear search
                    </Button>
                  </div>
                )}

              {members?.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">
                    No members found in this club.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Show members without player profiles at the end */}
          {membersWithoutProfiles.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-serif mb-4">
                Members Without Profiles
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {membersWithoutProfiles.map((memberData) => (
                  <div
                    key={memberData.member.user_id}
                    className="p-4 border rounded-lg bg-gray-50"
                  >
                    <p className="font-medium">Member (No Profile)</p>
                    <p className="text-sm text-gray-500 mt-2">
                      This member hasn't completed their player profile yet.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Members;
