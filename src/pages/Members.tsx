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

  // Enhanced debugging
  console.log("🔍 Members component render - clubId:", clubId);
  console.log("🔍 Current URL:", window.location.pathname);

  // Set context from URL if available (FIRST useEffect)
  useEffect(() => {
    if (urlClubId && urlClubId !== contextClubId) {
      setClubId(urlClubId);
    }
  }, [urlClubId, contextClubId, setClubId]);

  // Check if clubId exists and redirect if not (SECOND useEffect)
  useEffect(() => {
    if (!clubId) {
      console.warn("❌ No clubId provided to members query.");
      navigate("/clubs");
    }
  }, [clubId, navigate]);

  // Enhanced debugging
  console.log("🔍 Members component render - urlClubId:", urlClubId);
  console.log("🔍 Members component render - contextClubId:", contextClubId);
  console.log("🔍 Members component render - final clubId:", clubId);
  console.log("🔍 Current URL:", window.location.pathname);

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
        // DEBUGGING: First, let's test if we can see ANY club_members records
        const { data: allMembers, error: allMembersError } = await supabase
          .from("club_members")
          .select("*")
          .limit(5);

        console.log("🔍 DEBUG: All club_members (first 5):", allMembers);
        console.log("🔍 DEBUG: All members error:", allMembersError);

        // DEBUGGING: Check current user's auth status
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        console.log("🔍 DEBUG: Current user:", user?.id);
        console.log("🔍 DEBUG: User error:", userError);

        // DEBUGGING: Check if current user is member of this specific club
        const { data: userMembership, error: membershipError } = await supabase
          .from("club_members")
          .select("*")
          .eq("club_id", clubId)
          .eq("user_id", user?.id || "")
          .single();

        console.log("🔍 DEBUG: User membership for this club:", userMembership);
        console.log("🔍 DEBUG: Membership error:", membershipError);

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

        // Test if we can fetch players at all
        const { data: allPlayers, error: allPlayersError } = await supabase
          .from("players")
          .select("id, first_name, last_name, user_id")
          .limit(5);

        console.log("🔍 DEBUG: All players (first 5):", allPlayers);
        console.log("🔍 DEBUG: All players error:", allPlayersError);

        const { data: playersRaw, error: playersError } = await supabase
          .from("players")
          .select(
            `
          id,
          first_name,
          last_name,
          image_url,
          user_id,
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

  {
    /* Member count and game creation status */
  }
  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
    <p className="font-semibold text-blue-800">Member Count Status:</p>
    <p className="text-blue-700">
      Current members: {members?.length || 0} / 4 minimum required
    </p>
    <p
      className={`text-sm ${
        (members?.length || 0) >= 4 ? "text-green-600" : "text-red-600"
      }`}
    >
      {(members?.length || 0) >= 4
        ? "✅ You can create games!"
        : `❌ Need ${4 - (members?.length || 0)} more members to create games`}
    </p>
  </div>;

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

  // Add this right before the return statement
  console.log("🚨 FINAL RENDER DEBUG:");
  console.log("- clubId:", clubId);
  console.log("- members data:", members);
  console.log("- isLoading:", isLoading);
  console.log("- error:", error);
  console.log("- query enabled:", !!clubId);

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

            {/* Debug info */}
            <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
              <p>
                <strong>Debug Info:</strong>
              </p>
              <p>Club ID: {clubId}</p>
              <p>Total members found: {members?.length || 0}</p>
              <p>
                Members with player profiles:{" "}
                {members?.filter((m) => m.player !== null).length || 0}
              </p>
              <p>
                Members without player profiles:{" "}
                {members?.filter((m) => m.player === null).length || 0}
              </p>
              <p>Is loading: {isLoading.toString()}</p>
            </div>

            {/* Member count and game creation status - MOVED INSIDE RETURN */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
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
            </div>
          </div>

          {/* Rest of your component... */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* ... existing members grid code ... */}
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
