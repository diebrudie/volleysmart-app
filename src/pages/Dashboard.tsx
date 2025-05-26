
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import SetBox from "@/components/match/SetBox";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyTeamsState } from "@/components/team-generator/EmptyTeamsState";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Pencil } from "lucide-react";
import { format, isWednesday } from "date-fns";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isCheckingClub, setIsCheckingClub] = useState(true);
  const [userClubId, setUserClubId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clubMemberCount, setClubMemberCount] = useState(0);

  // Check if user belongs to any club or has created one
  useEffect(() => {
    const checkUserClub = async () => {
      if (!user?.id) return;

      try {
        // First check if user has created any club
        const { data: createdClub, error: createdError } = await supabase
          .from('clubs')
          .select('id')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (createdClub) {
          setUserClubId(createdClub.id);
          setUserRole('admin'); // Creator is always admin
          setIsCheckingClub(false);
          return;
        }

        // If not a creator, check if user is a member of any club
        const { data: clubMember, error: memberError } = await supabase
          .from('club_members')
          .select('club_id, role')
          .eq('user_id', user.id)
          .order('joined_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (clubMember) {
          setUserClubId(clubMember.club_id);
          setUserRole(clubMember.role);
          setIsCheckingClub(false);
          return;
        }

        // User doesn't belong to any club and hasn't created one
        navigate('/start');
      } catch (error) {
        console.error('Error checking user club:', error);
        // On error, safely redirect to start
        navigate('/start');
      } finally {
        setIsCheckingClub(false);
      }
    };

    checkUserClub();
  }, [user, navigate]);

  // Query to fetch club details including name
  const { data: clubDetails } = useQuery({
    queryKey: ['clubDetails', userClubId],
    queryFn: async () => {
      if (!userClubId) return null;

      const { data, error } = await supabase
        .from('clubs')
        .select('id, name, slug')
        .eq('id', userClubId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userClubId && !isCheckingClub,
  });

  // Query to fetch club member count
  const { data: memberCount } = useQuery({
    queryKey: ['clubMemberCount', userClubId],
    queryFn: async () => {
      if (!userClubId) return 0;

      const { count } = await supabase
        .from('club_members')
        .select('*', { count: 'exact', head: true })
        .eq('club_id', userClubId);

      return count || 0;
    },
    enabled: !!userClubId && !isCheckingClub,
  });

  // Update member count when query data changes
  useEffect(() => {
    if (memberCount !== undefined) {
      setClubMemberCount(memberCount);
    }
  }, [memberCount]);

  // Query to fetch the latest game
  const { data: latestGame, isLoading } = useQuery({
    queryKey: ['latestGame', userClubId],
    queryFn: async () => {
      if (!userClubId) return null;

      // Get the latest match day for that club
      const { data: matchDay } = await supabase
        .from('match_days')
        .select(`
          id, 
          date, 
          notes,
          match_teams (
            id,
            team_name,
            team_players (
              player_id,
              players (
                id,
                first_name,
                last_name
              )
            )
          ),
          matches (
            id,
            game_number,
            team_a_score,
            team_b_score
          )
        `)
        .eq('club_id', userClubId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      return matchDay;
    },
    enabled: !!userClubId && !isCheckingClub,
  });

  const handleInviteMembers = () => {
    if (userClubId) {
      navigate(`/invite-members/${userClubId}`);
    }
  };

  const handleCreateGame = () => {
    navigate('/new-game');
  };

  // Show loading state while checking club membership
  if (isCheckingClub) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </div>
    );
  }

  // Loading state while fetching the latest game
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

  // If no games exist yet, show the empty state
  if (!latestGame) {
    const canGenerateTeams = clubMemberCount >= 4;
    const canInviteMembers = userRole === 'admin';

    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center p-4">
          <div className="max-w-lg w-full text-center">
            {clubDetails && (
              <p className="text-lg text-gray-700 mb-4">
                Welcome to <span className="font-semibold">{clubDetails.name}</span>!
              </p>
            )}
            <h1 className="text-3xl font-bold mb-2">You haven't played any games yet.</h1>
            <p className="text-gray-600 mb-8">
              {canInviteMembers 
                ? "Proceed with inviting other members to your club or creating a game:"
                : "Wait for the club admin to invite more members or create a game:"
              }
            </p>
            <EmptyTeamsState 
              canGenerateTeams={canGenerateTeams} 
              onGenerateTeams={handleCreateGame} 
              onInviteMembers={handleInviteMembers}
              canInviteMembers={canInviteMembers}
            />
          </div>
        </div>
      </div>
    );
  }

  // Format and prepare match data
  const teamA = latestGame.match_teams?.find(team => team.team_name === 'Team A');
  const teamB = latestGame.match_teams?.find(team => team.team_name === 'Team B');
  
  const teamAPlayers = teamA?.team_players.map(tp => ({
    id: tp.player_id,
    name: `${tp.players.first_name} ${tp.players.last_name}`,
    position: '',
  })) || [];
  
  const teamBPlayers = teamB?.team_players.map(tp => ({
    id: tp.player_id,
    name: `${tp.players.first_name} ${tp.players.last_name}`,
    position: '',
  })) || [];

  // Organize match scores
  const scores = latestGame.matches.map(match => ({
    gameNumber: match.game_number,
    teamA: match.team_a_score,
    teamB: match.team_b_score,
  }));

  // Calculate the match result
  const teamAWins = scores.filter(game => 
    game.teamA !== null && game.teamB !== null && game.teamA > game.teamB
  ).length;
  
  const teamBWins = scores.filter(game => 
    game.teamA !== null && game.teamB !== null && game.teamB > game.teamA
  ).length;
  
  // Winner team
  const hasPlayedAnySet = scores.some(game => 
    game.teamA !== null && game.teamB !== null && (game.teamA > 0 || game.teamB > 0)
  );
  
  const winner = hasPlayedAnySet 
    ? (teamAWins > teamBWins ? "Team A" : (teamBWins > teamAWins ? "Team B" : "Tie")) 
    : "TBD";

  const handleSetScoreUpdate = async (setNumber: number, teamAScore: number, teamBScore: number) => {
    // Update score in the database
    const matchToUpdate = latestGame.matches.find(m => m.game_number === setNumber);
    
    if (matchToUpdate) {
      await supabase
        .from('matches')
        .update({
          team_a_score: teamAScore,
          team_b_score: teamBScore
        })
        .eq('id', matchToUpdate.id);
    }
  };

  // Format the match date
  const matchDate = latestGame.date ? new Date(latestGame.date) : new Date();
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  // Determine if the match is from today and if today is Wednesday
  const today = new Date();
  const isMatchToday = matchDate.toDateString() === today.toDateString();
  const isTodayWednesday = isWednesday(today);
  
  // Determine which heading to display
  const headingText = (isMatchToday && isTodayWednesday) ? "Today's Game Overview" : "Last Game Overview";

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Game Overview with dynamic heading */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-serif mb-2">{headingText}</h1>
              <p className="text-gray-600">{formatDate(matchDate)}</p>
            </div>
            <button className="flex items-center gap-1 text-sm font-medium">
              <Pencil className="h-4 w-4" /> Edit Teams
            </button>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Left Column - Winner Card */}
            <div className="h-full">
              <div className="rounded-lg overflow-hidden border border-gray-200 h-full flex flex-col">
                <div className="bg-volleyball-primary text-white p-4 text-center">
                  <h2 className="text-2xl font-bold">SCORE</h2>
                </div>
                <div className="bg-white p-6 text-center flex-grow flex flex-col justify-center">
                  <h3 className="text-3xl font-bold mb-4">
                    {hasPlayedAnySet ? winner : "TBD"}
                  </h3>
                  <div className="text-5xl font-bold">
                    <span className="text-red-500">{teamAWins}</span> - <span className="text-emerald-500">{teamBWins}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Team Cards */}
            <div className="h-full">
              <div className="flex h-full rounded-lg overflow-hidden border border-gray-200">
                {/* Team A Card */}
                <div className="w-1/2 bg-white p-0">
                  <h3 className="bg-red-500 text-white py-1 px-2 text-center">Team A</h3>
                  <ul className="space-y-0.5 p-4">
                    {teamAPlayers.map((player, index) => (
                      <li key={player.id} className="text-sm">
                        <span className="font-medium">{index + 1}. {player.name}</span>
                        {player.position && <span className="text-gray-600"> - {player.position}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Team B Card */}
                <div className="w-1/2 bg-white p-0">
                  <h3 className="bg-emerald-500 text-white py-1 px-2 text-center">Team B</h3>
                  <ul className="space-y-0.5 p-4">
                    {teamBPlayers.map((player, index) => (
                      <li key={player.id} className="text-sm">
                        <span className="font-medium">{index + 1}. {player.name}</span>
                        {player.position && <span className="text-gray-600"> - {player.position}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Sets Layout - Grid arrangement */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Set 1 - Larger box on the left spanning two rows */}
            <div className="md:row-span-2">
              <SetBox
                key={1}
                setNumber={1}
                teamAScore={scores.find(score => score.gameNumber === 1)?.teamA}
                teamBScore={scores.find(score => score.gameNumber === 1)?.teamB}
                onScoreUpdate={handleSetScoreUpdate}
                isLarge={true}
              />
            </div>

            {/* Column 2 top row: Set 2 */}
            <div>
              <SetBox
                key={2}
                setNumber={2}
                teamAScore={scores.find(score => score.gameNumber === 2)?.teamA}
                teamBScore={scores.find(score => score.gameNumber === 2)?.teamB}
                onScoreUpdate={handleSetScoreUpdate}
              />
            </div>

            {/* Column 3 top row: Set 4 */}
            <div>
              <SetBox
                key={4}
                setNumber={4}
                teamAScore={scores.find(score => score.gameNumber === 4)?.teamA}
                teamBScore={scores.find(score => score.gameNumber === 4)?.teamB}
                onScoreUpdate={handleSetScoreUpdate}
              />
            </div>

            {/* Column 2 bottom row: Set 3 */}
            <div>
              <SetBox
                key={3}
                setNumber={3}
                teamAScore={scores.find(score => score.gameNumber === 3)?.teamA}
                teamBScore={scores.find(score => score.gameNumber === 3)?.teamB}
                onScoreUpdate={handleSetScoreUpdate}
              />
            </div>

            {/* Column 3 bottom row: Set 5 */}
            <div>
              <SetBox
                key={5}
                setNumber={5}
                teamAScore={scores.find(score => score.gameNumber === 5)?.teamA}
                teamBScore={scores.find(score => score.gameNumber === 5)?.teamB}
                onScoreUpdate={handleSetScoreUpdate}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
