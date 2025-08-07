import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClub } from "@/contexts/ClubContext";

interface Club {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

const JoinClub = () => {
  const { user } = useAuth();
  const { setClubId: setGlobalClubId } = useClub();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clubIdInput, setClubIdInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userCreatedClubs, setUserCreatedClubs] = useState<Club[]>([]);

  // Fetch clubs created by the current user
  useEffect(() => {
    const fetchUserCreatedClubs = async () => {
      if (!user?.id) return;

      try {
        const { data: clubs, error } = await supabase
          .from("clubs")
          .select("id, name, slug, created_at")
          .eq("created_by", user.id);

        if (error) {
          console.error("Error fetching user created clubs:", error);
        } else {
          setUserCreatedClubs(clubs || []);
        }
      } catch (error) {
        console.error("Unexpected error fetching clubs:", error);
      }
    };

    fetchUserCreatedClubs();
  }, [user?.id]);

  const handleBack = () => {
    // Use browser's history to go back to the previous page
    window.history.back();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !clubIdInput.trim()) return;

    setIsLoading(true);

    try {
      const trimmedClubId = clubIdInput.trim();

      // First try exact match
      let { data: club, error: clubError } = await supabase
        .from("clubs")
        .select("id, name, slug")
        .eq("slug", trimmedClubId)
        .maybeSingle();

      // If no exact match, try case-insensitive
      if (!club && !clubError) {
        const { data: clubCaseInsensitive, error: clubCaseError } =
          await supabase
            .from("clubs")
            .select("id, name, slug")
            .ilike("slug", trimmedClubId)
            .maybeSingle();

        club = clubCaseInsensitive;
        clubError = clubCaseError;
      }

      if (clubError) {
        console.error("Database error when searching for club:", clubError);
        toast({
          title: "Database error",
          description:
            "There was an error searching for the club. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!club) {
        toast({
          title: "Club not found",
          description: "Please check the Club ID and try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Check if user is already a member
      const { data: existingMember, error: memberError } = await supabase
        .from("club_members")
        .select("id")
        .eq("club_id", club.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (memberError) {
        console.error("Error checking membership:", memberError);
        toast({
          title: "Error checking membership",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (existingMember) {
        toast({
          title: "Already a member",
          description: "You are already a member of this club.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Add user as a member
      const { error: insertError } = await supabase
        .from("club_members")
        .insert({
          club_id: club.id,
          user_id: user.id,
          role: "member",
        });

      if (insertError) {
        console.error("Error joining club:", insertError);
        toast({
          title: "Error joining club",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      setGlobalClubId(club.id);
      localStorage.setItem("lastVisitedClub", club.id);

      toast({
        title: "Successfully joined club!",
        description: `Welcome to ${club.name}`,
      });

      // Redirect to dashboard
      navigate(`/dashboard/${club.id}`);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-6 p-0 h-auto font-normal text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-transparent dark:hover:bg-transparent"
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>

        <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <h1 className="text-2xl font-semibold text-center text-gray-900 dark:text-gray-100">
              Join a club
            </h1>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clubId">Please insert a Club ID</Label>
                <Input
                  id="clubId"
                  type="text"
                  placeholder="AB12C"
                  value={clubIdInput}
                  onChange={(e) => setClubIdInput(e.target.value)}
                  required
                />
              </div>
              <Button
                variant="primary"
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Joining..." : "Join Club"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default JoinClub;
