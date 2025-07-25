import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { useClub } from "@/contexts/ClubContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { Spinner } from "@/components/ui/spinner";
import { MemberCard } from "@/components/members/MemberCard";

// Simple types to avoid complex Supabase type inference
interface ClubMember {
  club_id: string;
  id: string;
  joined_at: string;
  role: string;
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

const Members = () => {
  console.log("🚨 MEMBERS COMPONENT IS RENDERING!");
  console.log("🚨 Members URL:", window.location.pathname);
  const { clubId: urlClubId } = useParams<{ clubId: string }>();
  const { clubId: contextClubId, setClubId } = useClub();
  const navigate = useNavigate();

  // Use URL clubId first, fallback to context
  const clubId = urlClubId || contextClubId;

  // Set context from URL if available
  useEffect(() => {
    if (urlClubId && urlClubId !== contextClubId) {
      setClubId(urlClubId);
    }
  }, [urlClubId, contextClubId, setClubId]);

  // Check if clubId exists and redirect if not
  useEffect(() => {
    if (!clubId) {
      console.warn("❌ No clubId provided to members query.");
      navigate("/clubs");
    }
  }, [clubId, navigate]);

  // Query to fetch club members
  const {
    data: members,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["clubMembers", clubId],
    queryFn: async (): Promise<MemberWithPlayer[]> => {
      if (!clubId) {
        console.log("❌ No clubId in queryFn");
        return [];
      }

      console.log("🚀 Starting query for clubId:", clubId);

      try {
        // Step 1: Get club members for the specific club
        const { data: clubMembersRaw, error: membersError } = await supabase
          .from("club_members")
          .select("club_id, id, joined_at, role, user_id, is_active")
          .eq("club_id", clubId)
          .eq("is_active", true);

        if (membersError) {
          console.error("❌ Error fetching club members:", membersError);
          throw membersError;
        }

        console.log("📊 Found club members:", clubMembersRaw);

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
        console.log("📋 User IDs to lookup:", userIds);

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
          console.log("Will continue without player data");
        }

        console.log("📊 Found players:", playersRaw);

        // Cast to our simple type
        const players = (playersRaw || []) as Player[];

        // Step 3: Combine data
        const result: MemberWithPlayer[] = clubMembers.map((member) => ({
          member,
          player:
            players.find((player) => player.user_id === member.user_id) || null,
        }));

        console.log("✅ Final combined result:", result);
        console.log(
          "✅ Members with player data:",
          result.filter((m) => m.player !== null).length
        );
        console.log(
          "✅ Members without player data:",
          result.filter((m) => m.player === null).length
        );

        return result;
      } catch (error) {
        console.error("❌ Unexpected error in query:", error);
        throw error;
      }
    },
    enabled: !!clubId,
  });

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
          <div className="mb-8">
            <h1 className="text-4xl font-serif mb-2">Club's Members</h1>
            <p className="text-gray-600">
              Here you will find all the available members of your club. Click
              on any to check their profile.
            </p>

            {/* Member count and game creation status */
            /* <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="font-semibold text-blue-800">
                Member Count Status:
              </p>
              <p className="text-blue-700">
                Current members: {members?.length || 0} / 4 minimum required
              </p>
              <p
                className={`text-sm ${
                  (members?.length || 0) >= 4
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {(members?.length || 0) >= 4
                  ? "✅ You can create games!"
                  : `❌ Need ${
                      4 - (members?.length || 0)
                    } more members to create games`}
              </p>
            </div> */}
          </div>

          {/* Members Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {members
              ?.filter((memberData) => memberData.player) // Only members with player data
              ?.sort((a, b) => {
                // Sort alphabetically by first name
                const firstNameA = a.player?.first_name?.toLowerCase() || "";
                const firstNameB = b.player?.first_name?.toLowerCase() || "";
                return firstNameA.localeCompare(firstNameB);
              })
              ?.map((memberData) => (
                <MemberCard
                  key={memberData.member.user_id}
                  member={memberData.player!} // Non-null assertion since we filtered above
                />
              ))}

            {/* Show members without player profiles at the end */}
            {members
              ?.filter((memberData) => !memberData.player)
              ?.map((memberData) => (
                <div
                  key={memberData.member.user_id}
                  className="p-4 border rounded-lg bg-gray-50"
                >
                  <p className="font-medium">Member (No Profile)</p>
                  <p className="text-sm text-gray-600">
                    Role: {memberData.member.role}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    This member hasn't completed their player profile yet.
                  </p>
                </div>
              ))}
          </div>

          {/* Empty state */}
          {members?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No members found in this club.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Members;
