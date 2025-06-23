
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarIcon, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useClub } from '@/contexts/ClubContext';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
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
  const { clubId } = useClub();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch club members/players
  const { data: players, isLoading: isLoadingPlayers } = useQuery({
    queryKey: ['clubPlayers', clubId],
    queryFn: async () => {
      if (!clubId) throw new Error('No club selected');
      
      const { data, error } = await supabase
        .from('players')
        .select('id, first_name, last_name')
        .eq('club_id', clubId)
        .order('first_name', { ascending: true });
      
      if (error) throw error;
      return data as ClubMember[];
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

  // Filter and format players based on search
  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    
    let filtered = players;
    
    if (searchQuery.trim()) {
      filtered = players.filter(player => 
        player.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.last_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered.map(player => ({
      ...player,
      displayName: `${player.first_name} ${player.last_name.charAt(0)}.`
    }));
  }, [players, searchQuery]);

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

  const handleSearchBlur = () => {
    if (!searchQuery.trim()) {
      setIsSearchExpanded(false);
    }
  };

  const canCreateTeams = selectedPlayers.length >= 4;

  const handleSubmit = async () => {
    if (!date) {
      toast({
        title: "Date required",
        description: "Please select a date for the game",
        variant: "destructive"
      });
      return;
    }

    if (!canCreateTeams) {
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

      // Add players to teams
      const teamAPlayers = teamA.map(playerId => ({
        match_team_id: teamAData.id,
        player_id: playerId,
        position_id: defaultPosition.id,
      }));

      const teamBPlayers = teamB.map(playerId => ({
        match_team_id: teamBData.id,
        player_id: playerId,
        position_id: defaultPosition.id,
      }));

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

      navigate(`/dashboard/${clubId}`);
      
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

  if (isLoadingPlayers) {
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
      
      <main className="flex-grow bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-4xl font-serif mb-8">Create New Game</h1>
          
          {/* Date Picker */}
          <div className="mb-6">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal h-12 text-base",
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
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Players Selection */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-[#F5C842] px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Select Players</h2>
              <div className="flex items-center">
                {isSearchExpanded ? (
                  <Input
                    type="text"
                    placeholder="Search players..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={handleSearchBlur}
                    className="w-48 h-8 text-sm"
                    autoFocus
                  />
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSearchClick}
                    className="p-1 h-8 w-8"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Players List */}
            <div className="max-h-96 overflow-y-auto">
              {filteredPlayers.length > 0 ? (
                filteredPlayers.map((player) => (
                  <div key={player.id} className="flex items-center justify-between px-6 py-3 border-b border-gray-100 last:border-b-0">
                    <label htmlFor={`player-${player.id}`} className="text-base font-medium text-gray-900 cursor-pointer flex-grow">
                      {player.displayName}
                    </label>
                    <Checkbox 
                      id={`player-${player.id}`}
                      checked={selectedPlayers.includes(player.id)}
                      onCheckedChange={() => handlePlayerToggle(player.id)}
                      className="h-5 w-5"
                    />
                  </div>
                ))
              ) : (
                <div className="px-6 py-8 text-center text-gray-500">
                  {searchQuery ? 'No players found matching your search.' : 'No players found in your club.'}
                </div>
              )}
            </div>
          </div>

          {/* Create Teams Button */}
          <div className="mt-8 flex justify-center">
            <Button
              onClick={handleSubmit}
              disabled={!canCreateTeams || isSubmitting || !date}
              className="px-8 py-3 text-base"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Creating...
                </>
              ) : (
                'Create Teams'
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NewGame;
