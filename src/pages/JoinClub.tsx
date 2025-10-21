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
        /**
         * Only show active clubs created by the user.
         * RLS also hides deleted clubs, but we add an explicit filter for clarity.
         */
        const { data: clubs, error } = await supabase
          .from("clubs")
          .select("id, name, slug, created_at, status")
          .eq("created_by", user.id)
          .eq("status", "active");
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

  /**
   * Join a club by slug using the text-returning RPC.
   * - RPC returns a string on success
   * - RPC throws 'club_not_found_or_deleted' on deleted/unknown slugs (handled via error)
   * - No 'any' used; no JSON parsing expected.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !clubIdInput.trim()) return;

    setIsLoading(true);
    try {
      const slug = clubIdInput.trim();

      // Optional: ensure session is valid (helpful for debugging auth/RLS)
      const { data: authCheck } = await supabase.auth.getUser();
      console.log("[auth uid]", authCheck?.user?.id);

      const { data, error } = await supabase.rpc("request_join_by_slug", {
        p_slug: slug,
      });

      if (error) {
        const isDeletedOrMissing =
          typeof error.message === "string" &&
          error.message.includes("club_not_found_or_deleted");

        toast({
          title: "Couldn’t join",
          description: isDeletedOrMissing
            ? "This club isn’t available (it may have been deleted)."
            : "Join request failed. Please try again.",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      const message: string =
        typeof data === "string"
          ? data
          : "Your request was sent to the club admins.";

      toast({
        title: "Request sent",
        description: message,
        duration: 2000,
      });

      // After a successful request, take the user back to Clubs
      navigate("/clubs");
    } catch (err) {
      console.error("Unexpected error:", err);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
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
