
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const JoinClub = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clubId, setClubId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !clubId.trim()) return;

    setIsLoading(true);

    try {
      // First check if the club exists by slug
      const { data: club, error: clubError } = await supabase
        .from('clubs')
        .select('id, name')
        .eq('slug', clubId.trim())
        .maybeSingle();

      if (clubError || !club) {
        toast({
          title: "Club not found",
          description: "Please check the Club ID and try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('club_members')
        .select('id')
        .eq('club_id', club.id)
        .eq('user_id', user.id)
        .maybeSingle();

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
        .from('club_members')
        .insert({
          club_id: club.id,
          user_id: user.id,
          role: 'member'
        });

      if (insertError) {
        console.error('Error joining club:', insertError);
        toast({
          title: "Error joining club",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Successfully joined club!",
        description: `Welcome to ${club.name}`,
      });

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error:', error);
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate('/start')}
          className="mb-6 p-0 h-auto font-normal text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <h1 className="text-2xl font-semibold text-center">Join a club</h1>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="clubId">Please insert a Club ID</Label>
                <Input
                  id="clubId"
                  type="text"
                  placeholder="AB12C"
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                  required
                />
              </div>
              <Button 
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
