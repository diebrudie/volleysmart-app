
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useClub } from "@/contexts/ClubContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { Spinner } from "@/components/ui/spinner";
import { MemberCard } from "@/components/members/MemberCard";

const Members = () => {
  const { clubId } = useClub();
  const navigate = useNavigate();

  useEffect(() => {
    if (!clubId) {
      console.warn("❌ No clubId provided to members query.");
      navigate("/clubs");
    }
  }, [clubId, navigate]);

  // Query to fetch club members
  const { data: members, isLoading } = useQuery({
    queryKey: ['clubMembers', clubId],
    queryFn: async () => {
      if (!clubId) return [];

      const { data, error } = await supabase
        .from('club_members')
        .select(`
          user_id,
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
      
      console.log("✅ Members data fetched:", data);
      console.log("📊 Number of members in this club:", data.length);
    
      return data;
    },
    enabled: !!clubId,
  });

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

  console.log('clubId from URL:', clubId);
  // ✅ Log the members array when it's not loading
  if (!isLoading && members) {
    console.log("📦 Rendered members list:", members);
  }
  
  console.log("🔍 clubId in Members.tsx:", clubId);
  console.log("📦 members fetched from Supabase:", members);
  console.log("🧩 Full member response object:", members);

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
          </div>

          {/* Members Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">            
            {members?.map((member) => {
              // Add type guard to ensure member.players exists
              if (member.players && typeof member.players === 'object' && !Array.isArray(member.players)) {
                return <MemberCard key={member.user_id} member={member.players} />;
              }
              return null;
            })}
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
