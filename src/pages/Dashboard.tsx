import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useClub } from "@/contexts/ClubContext";
import { useParams } from "react-router-dom";

// Define proper interfaces
interface GamePlayerData {
  player_id: string;
  team_name: string;
  position_name: string;
  players: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface MatchData {
  id: string;
  game_number: number;
  team_a_score: number | null;
  team_b_score: number | null;
}

interface MatchDayData {
  id: string;
  date: string;
  notes: string | null;
  matches: MatchData[];
  game_players: GamePlayerData[];
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isCheckingClub, setIsCheckingClub] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [clubMemberCount, setClubMemberCount] = useState(0);
  const { setClubId } = useClub();
  const { clubId: urlClubId } = useParams<{ clubId: string }>();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (urlClubId) {
      setClubId(urlClubId);
    }
  }, [urlClubId, setClubId]);

  // Use urlClubId for the rest of the component
  const userClubId = urlClubId;

  // Check if user belongs to any club or has created one
  useEffect(() => {
    const checkUserClub = async () => {
      if (!user?.id) return;

      try {
        // If clubId is provided in URL, use that
        if (userClubId) {
          // Store the visited club in localStorage for future logins
          localStorage.setItem("lastVisitedClub", userClubId);

          // Verify user has access to this club
          const { data: memberCheck } = await supabase
            .from("club_members")
            .select("role")
            .eq("club_id", userClubId)
            .eq("user_id", user.id)
            .maybeSingle();

          if (memberCheck) {
            setUserRole(memberCheck.role);
            setIsCheckingClub(false);
            return;
          }

          // Check if user is the creator
          const { data: creatorCheck } = await supabase
            .from("clubs")
            .select("id")
            .eq("id", userClubId)
            .eq("created_by", user.id)
            .maybeSingle();

          if (creatorCheck) {
            setUserRole("admin");
            setIsCheckingClub(false);
            return;
          }

          // User doesn't have access to this club
          navigate("/clubs");
          return;
        }

        // User doesn't belong to any club and hasn't created one
        navigate("/start");
      } catch (error) {
        console.error("Error checking user club:", error);
        // On error, safely redirect to start
        navigate("/start");
      } finally {
        setIsCheckingClub(false);
      }
    };

    checkUserClub();
  }, [user, navigate, userClubId]);

  // Query to fetch club details including name
  const { data: clubDetails } = useQuery({
    queryKey: ["clubDetails", userClubId],
    queryFn: async () => {
      if (!userClubId) return null;

      const { data, error } = await supabase
        .from("clubs")
        .select("id, name, slug")
        .eq("id", userClubId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userClubId && !isCheckingClub,
  });

  // Query to fetch club member count
  const { data: memberCount } = useQuery({
    queryKey: ["clubMemberCount", userClubId],
    queryFn: async () => {
      if (!userClubId) return 0;

      const { count } = await supabase
        .from("club_members")
        .select("*", { count: "exact", head: true })
        .eq("club_id", userClubId);

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

  useEffect(() => {
    console.log("=== USER OBJECT DEBUG ===");
    console.log("Full user object:", user);
    console.log("user.role:", user?.role);
    console.log("typeof user.role:", typeof user?.role);
  }, [user]);

  // Query to fetch the latest game with separate queries to avoid relation issues
  const { data: latestGame, isLoading } = useQuery({
    queryKey: ["latestGame", userClubId],
    queryFn: async (): Promise<MatchDayData | null> => {
      if (!userClubId) return null;

      console.log("=== FETCHING LATEST GAME ===");
      console.log("Club ID:", userClubId);

      // First, get the latest match day
      // Get the latest match day that actually has players
      const { data: allMatchDays, error: matchDayError } = await supabase
        .from("match_days")
        .select(
          `
    id,
    date,
    notes,
    created_at,
    matches (
      id,
      game_number,
      team_a_score,
      team_b_score
    )
  `
        )
        .eq("club_id", userClubId)
        .order("created_at", { ascending: false });

      if (matchDayError) {
        console.error("Match day error:", matchDayError);
        throw matchDayError;
      }

      // console. log("All match days:", allMatchDays);

      // Find the latest match day that has game players
      let matchDay = null;
      if (allMatchDays && allMatchDays.length > 0) {
        for (const md of allMatchDays) {
          console.log("Checking match day:", md.id);

          // Quick check if this match day has game players
          const { data: playerCheck } = await supabase
            .from("game_players")
            .select("id")
            .eq("match_day_id", md.id)
            .limit(1);

          //console. log(`Match day ${md.id} has ${playerCheck?.length || 0} players`);

          if (playerCheck && playerCheck.length > 0) {
            matchDay = md;
            console.log("Using match day:", matchDay.id);
            break;
          }
        }
      }

      // Alternative query approach - fetch game_players and players separately
      // console. log("About to query game_players for match_day_id:", matchDay.id);

      // First get the game players
      const { data: gamePlayersRaw, error: gamePlayersError } = await supabase
        .from("game_players")
        .select("player_id, team_name, position_played")
        .eq("match_day_id", matchDay.id);

      console.log("Raw game players:", gamePlayersRaw);

      if (gamePlayersError) {
        console.error("Game players error:", gamePlayersError);
      }

      let gamePlayers = [];

      if (gamePlayersRaw && gamePlayersRaw.length > 0) {
        // Get player IDs
        const playerIds = gamePlayersRaw.map((gp) => gp.player_id);

        console.log("Player IDs to fetch:", playerIds);

        // Then get the player details
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("id, first_name, last_name")
          .in("id", playerIds);

        console.log("Players data:", playersData);

        if (playersError) {
          console.error("Players error:", playersError);
        }

        // Combine the data
        if (playersData) {
          gamePlayers = gamePlayersRaw.map((gp) => {
            const player = playersData.find((p) => p.id === gp.player_id);
            return {
              player_id: gp.player_id,
              team_name: gp.team_name,
              position_name: gp.position_played || "No Position",
              players: player || {
                id: gp.player_id,
                first_name: "Unknown",
                last_name: "Player",
              },
            };
          });
        }
      }
      // console. log("Final combined game players:", gamePlayers);

      // Combine the data
      const result: MatchDayData = {
        ...matchDay,
        game_players: gamePlayers || [],
      };

      return result;
    },
    enabled: !!userClubId && !isCheckingClub,
  });

  const handleInviteMembers = () => {
    if (userClubId) {
      navigate(`/invite-members/${userClubId}`);
    }
  };

  const handleCreateGame = () => {
    if (userClubId) {
      navigate(`/new-game/${userClubId}`);
    }
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
    const canInviteMembers = userRole === "admin";

    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center p-4">
          <div className="max-w-lg w-full text-center">
            {clubDetails && (
              <p className="text-lg text-gray-700 mb-4">
                Welcome to{" "}
                <span className="font-semibold">{clubDetails.name}</span>!
              </p>
            )}
            <h1 className="text-3xl font-bold mb-2">
              You haven't played any games yet.
            </h1>
            <p className="text-gray-600 mb-8">
              {canInviteMembers
                ? "Proceed with inviting other members to your club or creating a game:"
                : "Wait for the club admin to invite more members or create a game:"}
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

  // Process the game players to extract teams
  let teamAPlayers: Array<{ id: string; name: string; position: string }> = [];
  let teamBPlayers: Array<{ id: string; name: string; position: string }> = [];

  if (latestGame?.game_players) {
    console.log("=== GAME PLAYERS DEBUG ===");
    console.log("Game players:", latestGame.game_players);

    teamAPlayers = latestGame.game_players
      .filter((gp) => gp.team_name === "team_a")
      .map((gp) => ({
        id: gp.player_id,
        name: `${gp.players.first_name} ${gp.players.last_name.charAt(0)}.`,
        position: gp.position_name || "No Position",
      }));

    teamBPlayers = latestGame.game_players
      .filter((gp) => gp.team_name === "team_b")
      .map((gp) => ({
        id: gp.player_id,
        name: `${gp.players.first_name} ${gp.players.last_name.charAt(0)}.`,
        position: gp.position_name || "No Position",
      }));

    console.log("Team A players:", teamAPlayers);
    console.log("Team B players:", teamBPlayers);
  }

  // Organize match scores
  const scores = latestGame.matches.map((match) => ({
    gameNumber: match.game_number,
    teamA: match.team_a_score,
    teamB: match.team_b_score,
  }));

  // Calculate the match result
  const teamAWins = scores.filter(
    (game) =>
      game.teamA !== null && game.teamB !== null && game.teamA > game.teamB
  ).length;

  const teamBWins = scores.filter(
    (game) =>
      game.teamA !== null && game.teamB !== null && game.teamB > game.teamA
  ).length;

  // Winner team
  const hasPlayedAnySet = scores.some(
    (game) =>
      game.teamA !== null &&
      game.teamB !== null &&
      (game.teamA > 0 || game.teamB > 0)
  );

  const winner = hasPlayedAnySet
    ? teamAWins > teamBWins
      ? "Team A"
      : teamBWins > teamAWins
      ? "Team B"
      : "Tie"
    : "TBD";

  const handleSetScoreUpdate = async (
    setNumber: number,
    teamAScore: number,
    teamBScore: number
  ) => {
    console.log("=== SCORE UPDATE DEBUG ===");
    console.log("Set Number:", setNumber);
    console.log("Team A Score:", teamAScore);
    console.log("Team B Score:", teamBScore);
    console.log("Latest Game:", latestGame);
    console.log("All Matches:", latestGame?.matches);

    try {
      // Find the match to update
      const matchToUpdate = latestGame?.matches?.find(
        (m) => m.game_number === setNumber
      );

      console.log("Match to update:", matchToUpdate);

      if (!matchToUpdate) {
        console.error("No match found for set number:", setNumber);
        return;
      }

      console.log("Updating match with ID:", matchToUpdate.id);

      // Update score in the database
      const { data, error } = await supabase
        .from("matches")
        .update({
          team_a_score: teamAScore,
          team_b_score: teamBScore,
        })
        .eq("id", matchToUpdate.id)
        .select(); // Add select() to see what was updated

      console.log("Supabase update result:", { data, error });

      if (error) {
        console.error("Error updating match score:", error);
        return;
      }

      console.log("Successfully updated match:", data);

      // Invalidate and refetch the latest game query
      console.log("Invalidating queries for userClubId:", userClubId);
      await queryClient.invalidateQueries({
        queryKey: ["latestGame", userClubId],
      });

      console.log("Queries invalidated successfully");
    } catch (error) {
      console.error("Error in handleSetScoreUpdate:", error);
    }
  };

  // Format the match date
  const matchDate = latestGame.date ? new Date(latestGame.date) : new Date();
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    };
    return date.toLocaleDateString("en-US", options);
  };

  // Determine if the match is from today
  const today = new Date();
  const isMatchToday = matchDate.toDateString() === today.toDateString();

  // Determine which heading to display
  const headingText = isMatchToday
    ? "Today's Game Overview"
    : "Last Game Overview";

  const handleEditTeamsClick = () => {
    console.log("=== EDIT TEAMS BUTTON CLICKED ===");
    console.log("userClubId:", userClubId);
    console.log("latestGame:", latestGame);
    console.log("latestGame.id:", latestGame?.id);
    console.log("userRole:", userRole);
    console.log("clubDetails:", clubDetails);

    if (!userClubId) {
      console.error("❌ No userClubId found!");
      return;
    }

    if (!latestGame?.id) {
      console.error("❌ No latestGame.id found!");
      return;
    }

    const targetPath = `/edit-game/${userClubId}/${latestGame.id}`;
    console.log("🚀 Navigating to:", targetPath);

    navigate(targetPath);
  };

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
            <button
              className="flex items-center gap-1 text-sm font-medium border border-gray-300 px-3 py-2 rounded-md hover:bg-gray-50"
              onClick={handleEditTeamsClick}
            >
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
                    <span className="text-red-500">{teamAWins}</span> -{" "}
                    <span className="text-emerald-500">{teamBWins}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Team Cards */}
            <div className="h-full">
              <div className="flex h-full rounded-lg overflow-hidden border border-gray-200">
                {/* Team A Card */}
                <div className="w-1/2 bg-white p-0">
                  <h3 className="bg-red-500 text-white py-1 px-2 text-center">
                    Team A
                  </h3>
                  <ul className="space-y-0.5 p-4">
                    {teamAPlayers.map((player, index) => (
                      <li key={player.id} className="text-sm">
                        <span className="font-medium">
                          {index + 1}. {player.name}
                        </span>
                        {player.position && (
                          <span className="text-gray-600">
                            {" "}
                            - {player.position}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Team B Card */}
                <div className="w-1/2 bg-white p-0">
                  <h3 className="bg-emerald-500 text-white py-1 px-2 text-center">
                    Team B
                  </h3>
                  <ul className="space-y-0.5 p-4">
                    {teamBPlayers.map((player, index) => (
                      <li key={player.id} className="text-sm">
                        <span className="font-medium">
                          {index + 1}. {player.name}
                        </span>
                        {player.position && (
                          <span className="text-gray-600">
                            {" "}
                            - {player.position}
                          </span>
                        )}
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
            <div className="md:row-span-2 order-1">
              <SetBox
                key={1}
                setNumber={1}
                teamAScore={
                  scores.find((score) => score.gameNumber === 1)?.teamA
                }
                teamBScore={
                  scores.find((score) => score.gameNumber === 1)?.teamB
                }
                onScoreUpdate={handleSetScoreUpdate}
                isLarge={true}
              />
            </div>

            {/* Set 2 */}
            <div className="order-2">
              <SetBox
                key={2}
                setNumber={2}
                teamAScore={
                  scores.find((score) => score.gameNumber === 2)?.teamA
                }
                teamBScore={
                  scores.find((score) => score.gameNumber === 2)?.teamB
                }
                onScoreUpdate={handleSetScoreUpdate}
              />
            </div>

            {/* Set 3 */}
            <div className="order-3 md:order-4">
              <SetBox
                key={3}
                setNumber={3}
                teamAScore={
                  scores.find((score) => score.gameNumber === 3)?.teamA
                }
                teamBScore={
                  scores.find((score) => score.gameNumber === 3)?.teamB
                }
                onScoreUpdate={handleSetScoreUpdate}
              />
            </div>

            {/* Set 4 */}
            <div className="order-4 md:order-3">
              <SetBox
                key={4}
                setNumber={4}
                teamAScore={
                  scores.find((score) => score.gameNumber === 4)?.teamA
                }
                teamBScore={
                  scores.find((score) => score.gameNumber === 4)?.teamB
                }
                onScoreUpdate={handleSetScoreUpdate}
              />
            </div>

            {/* Set 5 */}
            <div className="order-5 md:order-4">
              <SetBox
                key={5}
                setNumber={5}
                teamAScore={
                  scores.find((score) => score.gameNumber === 5)?.teamA
                }
                teamBScore={
                  scores.find((score) => score.gameNumber === 5)?.teamB
                }
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
