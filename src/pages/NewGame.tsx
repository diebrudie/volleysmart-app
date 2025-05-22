
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { CalendarIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface NewGameFormData {
  date: Date;
  players: string[];
}

interface ClubMember {
  id: string;
  first_name: string;
  last_name: string;
}

const NewGame = () => {
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch club ID for the current user
  const { data: clubData, isLoading: isLoadingClub } = useQuery({
    queryKey: ['userClub', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('club_members')
        .select('club_id')
        .eq('user_id', user?.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch club members/players
  const { data: players, isLoading: isLoadingPlayers } = useQuery({
    queryKey: ['clubPlayers', clubData?.club_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('id, first_name, last_name')
        .eq('club_id', clubData?.club_id);
      
      if (error) throw error;
      return data as ClubMember[];
    },
    enabled: !!clubData?.club_id,
  });

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers(current => 
      current.includes(playerId)
        ? current.filter(id => id !== playerId)
        : [...current, playerId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date) {
      toast({
        title: "Date required",
        description: "Please select a date for the game",
        variant: "destructive"
      });
      return;
    }

    if (selectedPlayers.length < 6) {
      toast({
        title: "Not enough players",
        description: "Please select at least 6 players to create teams",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Create a new match day
      const { data: matchDay, error: matchDayError } = await supabase
        .from('match_days')
        .insert({
          date: format(date, 'yyyy-MM-dd'),
          created_by: user?.id,
          club_id: clubData?.club_id,
          team_generated: true,
        })
        .select()
        .single();
      
      if (matchDayError) throw matchDayError;

      // Shuffle players and split into two teams
      const shuffledPlayers = [...selectedPlayers].sort(() => Math.random() - 0.5);
      const midpoint = Math.ceil(shuffledPlayers.length / 2);
      const teamA = shuffledPlayers.slice(0, midpoint);
      const teamB = shuffledPlayers.slice(midpoint);

      // Create Team A
      const { data: teamAData, error: teamAError } = await supabase
        .from('match_teams')
        .insert({
          match_day_id: matchDay.id,
          team_name: 'Team A',
        })
        .select()
        .single();
      
      if (teamAError) throw teamAError;

      // Create Team B
      const { data: teamBData, error: teamBError } = await supabase
        .from('match_teams')
        .insert({
          match_day_id: matchDay.id,
          team_name: 'Team B',
        })
        .select()
        .single();
      
      if (teamBError) throw teamBError;

      // Add players to Team A
      const teamAPlayers = teamA.map(playerId => ({
        match_team_id: teamAData.id,
        player_id: playerId,
      }));

      // Add players to Team B
      const teamBPlayers = teamB.map(playerId => ({
        match_team_id: teamBData.id,
        player_id: playerId,
      }));

      // Insert players into teams
      const { error: teamPlayersError } = await supabase
        .from('team_players')
        .insert([...teamAPlayers, ...teamBPlayers]);
      
      if (teamPlayersError) throw teamPlayersError;

      // Create empty match scores for 5 sets
      const matchScores = Array.from({ length: 5 }, (_, i) => ({
        match_day_id: matchDay.id,
        game_number: i + 1,
        team_a_score: 0,
        team_b_score: 0,
        added_by_user_id: user?.id,
      }));

      const { error: matchesError } = await supabase
        .from('matches')
        .insert(matchScores);
      
      if (matchesError) throw matchesError;

      toast({
        title: "Game created!",
        description: "Your game has been created and teams have been generated",
      });

      // Navigate to the dashboard to see the game
      navigate('/dashboard');
      
    } catch (error: any) {
      console.error('Error creating game:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create game. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = isLoadingClub || isLoadingPlayers;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-3xl font-semibold mb-6">Let's Create a New Game</h1>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
              <div className="space-y-6">
                {/* Date Picker */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select the Date of the Game *
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                {/* Players Selection */}
                <div>
                  <h3 className="text-md font-medium mb-2">
                    Add all the players available for today's game
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Teams will be randomized after game's creation
                  </p>
                  
                  {players && players.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {players.map((player) => (
                        <div key={player.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`player-${player.id}`}
                            checked={selectedPlayers.includes(player.id)}
                            onCheckedChange={() => handlePlayerToggle(player.id)}
                          />
                          <label 
                            htmlFor={`player-${player.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {player.first_name} {player.last_name}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No players found in your club.</p>
                  )}
                </div>
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || selectedPlayers.length < 6 || !date}
                >
                  {isSubmitting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Creating Game...
                    </>
                  ) : (
                    'Create Game'
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default NewGame;
