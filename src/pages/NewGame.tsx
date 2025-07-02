
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarIcon, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from "react";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useClub } from '@/contexts/ClubContext';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useParams } from 'react-router-dom';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ClubMember {
  id: string;
  first_name: string;
  last_name: string;
}

const NewGame = () => {
  const { user } = useAuth();
  const { clubId: urlClubId } = useParams<{ clubId: string }>();
  const clubId = urlClubId;
  const { setClubId } = useClub();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Set the club context from URL
  useEffect(() => {
    if (urlClubId) {
      setClubId(urlClubId);
    }
  }, [urlClubId, setClubId]);

  // Fetch club members/players
  const { data: players, isLoading: isLoadingPlayers } = useQuery({
    queryKey: ['clubPlayers', clubId],
    queryFn: async () => {
      if (!clubId) return [];

      // Get club members first
      const { data: clubMembers, error: membersError } = await supabase
        .from('club_members')
        .select('user_id')
        .eq('club_id', clubId)
        .eq('is_active', true);

      if (membersError) throw membersError;

      if (!clubMembers || clubMembers.length === 0) return [];

      const userIds = clubMembers.map(member => member.user_id);

      // Get players for these users
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('id, first_name, last_name, user_id')
        .in('user_id', userIds);

      if (playersError) throw playersError;

      return (playersData || []) as ClubMember[];
    },
    enabled: !!clubId,
  });

  // Fetch a default position ID to use
  const { data: defaultPosition } = useQuery({
    queryKey: ['defaultPosition'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('positions')
        .select('id')
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Filter and sort players
  const filteredAndSortedPlayers = players
    ? players
        .filter(player =>
          `${player.first_name} ${player.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.first_name.localeCompare(b.first_name))
    : [];

  const handlePlayerToggle = (playerId: string) => {
    setSelectedPlayers(current =>
      current.includes(playerId)
        ? current.filter(id => id !== playerId)
        : [...current, playerId]
    );
  };

  const handleSearchClick = () => {
    setIsSearchExpanded(true);
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

    if (selectedPlayers.length < 4) {
      toast({
        title: "Not enough players",
        description: "Please select at least 4 players to create teams",
        variant: "destructive"
      });
      return;
    }

    if (!defaultPosition) {
      toast({
        title: "Position data missing",
        description: "Unable to create teams without position data",
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
          club_id: clubId,
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

      // Add players to Team A with position_id
      const teamAPlayers = teamA.map(playerId => ({
        match_team_id: teamAData.id,
        player_id: playerId,
        position_id: defaultPosition.id,
      }));

      // Add players to Team B with position_id
      const teamBPlayers = teamB.map(playerId => ({
        match_team_id: teamBData.id,
        player_id: playerId,
        position_id: defaultPosition.id,
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
      navigate(`/dashboard/${clubId}`);

    } catch (error: unknown) {
      console.error('Error creating game:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create game. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPlayerName = (player: ClubMember) => {
    return `${player.first_name} ${player.last_name.charAt(0)}.`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-4xl font-serif mb-8">Create New Game</h1>

          {isLoadingPlayers ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Date Picker */}
              <div className="bg-white p-4 rounded-lg">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-gray-300",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, 'EEEE, do MMMM yyyy') : <span>Select Game's Date</span>}
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
              <div className="bg-white rounded-lg overflow-hidden">
                <div className="bg-amber-400 p-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-black">Select Players</h2>
                  <div className="flex items-center">
                    {isSearchExpanded ? (
                      <Input
                        type="text"
                        placeholder="Search players..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-48 bg-white border-none"
                        autoFocus
                        onBlur={() => {
                          if (!searchTerm) setIsSearchExpanded(false);
                        }}
                      />
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleSearchClick}
                        className="text-black hover:bg-amber-500"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {filteredAndSortedPlayers.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                      {filteredAndSortedPlayers.map((player) => (
                        <div key={player.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                          <span className="font-medium">{formatPlayerName(player)}</span>
                          <Checkbox
                            checked={selectedPlayers.includes(player.id)}
                            onCheckedChange={() => handlePlayerToggle(player.id)}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-500">
                      {searchTerm ? 'No players found matching your search.' : 'No players found in your club.'}
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                disabled={isSubmitting || selectedPlayers.length < 4 || !date}
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Creating Game...
                  </>
                ) : (
                  'Create Teams'
                )}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};

export default NewGame;
