import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react"; // Add this import
import { useClub } from "@/contexts/ClubContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { Spinner } from "@/components/ui/spinner";
import { MemberCard } from "@/components/members/MemberCard";

const Members = () => {
  const { clubId } = useClub();
  const navigate = useNavigate();

  // Enhanced debugging
  console.log("🔍 Members component render - clubId:", clubId);
  console.log("🔍 Current URL:", window.location.pathname);

  useEffect(() => {
    if (!clubId) {
      console.warn("❌ No clubId provided to members query.");
      navigate("/clubs");
    }
  }, [clubId, navigate]);

  // Query to fetch club members
  const { data: members, isLoading, error } = useQuery({
    queryKey: ['clubMembers', clubId],
    queryFn: async () => {
      if (!clubId) {
        console.log("❌ No clubId in queryFn");
        return [];
      }

      console.log("🚀 Starting query for clubId:", clubId);
      
      // First, let's check if there are ANY club_members for this club
      const { data: allMembers, error: allMembersError } = await supabase
        .from('club_members')
        .select('*')
        .eq('club_id', clubId);
      
      console.log("📊 All club_members for this club:", allMembers);
      console.log("📊 All members count:", allMembers?.length);

      // Now the original query
      const { data, error } = await supabase
        .from('club_members')
        .select(`
          player_id,
          is_active,
          players (
            id,
            first_name,
            last_name,
            image_url,
            player_positions (
              is_primary,
              positions (
                name
              )
            )
          )
        `)
        .eq('club_id', clubId)
        .eq('is_active', true);

      if (error) {
        console.error("❌ Supabase error fetching club members:", error);
        throw error;
      }

      console.log("✅ Final members data fetched:", data);
      console.log("📊 Active members count:", data?.length);
      console.log("📊 Raw response:", JSON.stringify(data, null, 2));

      return data;
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
              Here you will find all the available members of your club. Click on any to check their profile.
            </p>
            {/* Debug info */}
            <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
              <p><strong>Debug Info:</strong></p>
              <p>Club ID: {clubId}</p>
              <p>Members count: {members?.length || 0}</p>
              <p>Is loading: {isLoading.toString()}</p>
            </div>
          </div>

          {/* Members Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">            
            {members?.map((member) => (
              <MemberCard key={member.player_id} member={member.players} />
            ))}
          </div>

          {/* Empty state */}
          {members?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No members found in this club.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Members;
