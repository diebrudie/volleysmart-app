import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ChevronLeft,
  Calendar,
  Trophy,
  Edit,
  Save,
  X,
  Trash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";

interface Player {
  id: string;
  first_name: string;
  last_name: string;
}

interface GamePlayer {
  player_id: string;
  team_name: string;
  position_played: string | null;
  players: Player;
}

interface Match {
  id: string;
  game_number: number;
  team_a_score: number;
  team_b_score: number;
}

interface MatchDayData {
  id: string;
  date: string;
  notes: string | null;
  club_id: string;
  matches: Match[];
  game_players: GamePlayer[];
  clubs: {
    name: string;
  };
}

const GameDetail = () => {
  const { matchDayId } = useParams<{ matchDayId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clubId, setClubId } = useClub();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [editedGames, setEditedGames] = useState<Match[]>([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Fetch match day data
  const {
    data: matchData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["matchDay", matchDayId],
    queryFn: async (): Promise<MatchDayData> => {
      if (!matchDayId) throw new Error("Match day ID is required");

      // console. log("=== FETCHING MATCH DAY DETAILS ===");
      // console. log("Match Day ID:", matchDayId);

      // Get match day with matches and club info
      const { data: matchDay, error: matchDayError } = await supabase
        .from("match_days")
        .select(
          `
          id,
          date,
          notes,
          club_id,
          matches (
            id,
            game_number,
            team_a_score,
            team_b_score
          ),
          clubs (
            name
          )
        `
        )
        .eq("id", matchDayId)
        .single();

      if (matchDayError) {
        console.error("Error fetching match day:", matchDayError);
        throw matchDayError;
      }

      // Get game players separately to avoid relation issues
      const { data: gamePlayersRaw, error: gamePlayersError } = await supabase
        .from("game_players")
        .select("player_id, team_name, position_played")
        .eq("match_day_id", matchDayId);

      if (gamePlayersError) {
        console.error("Error fetching game players:", gamePlayersError);
      }

      let gamePlayers: GamePlayer[] = [];

      if (gamePlayersRaw && gamePlayersRaw.length > 0) {
        // Get player details
        const playerIds = gamePlayersRaw.map((gp) => gp.player_id);
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("id, first_name, last_name")
          .in("id", playerIds);

        if (playersError) {
          console.error("Error fetching players:", playersError);
        }

        // Combine the data
        if (playersData) {
          gamePlayers = gamePlayersRaw.map((gp) => {
            const player = playersData.find((p) => p.id === gp.player_id);
            return {
              player_id: gp.player_id,
              team_name: gp.team_name,
              position_played: gp.position_played,
              players: player || {
                id: gp.player_id,
                first_name: "Unknown",
                last_name: "Player",
              },
            };
          });
        }
      }

      const result: MatchDayData = {
        ...matchDay,
        game_players: gamePlayers,
      };

      // console. log("Match day data:", result);
      return result;
    },
    enabled: !!matchDayId,
  });

  // Set club ID from match data
  useEffect(() => {
    if (matchData?.club_id && matchData.club_id !== clubId) {
      setClubId(matchData.club_id);
    }
  }, [matchData, clubId, setClubId]);

  // Initialize editing state when data loads
  useEffect(() => {
    if (matchData) {
      setEditedGames([...matchData.matches]);
    }
  }, [matchData]);

  // Check user permissions
  const { data: userPermissions } = useQuery({
    queryKey: ["userPermissions", matchData?.club_id, user?.id],
    queryFn: async () => {
      if (!matchData?.club_id || !user?.id) return null;

      const { data } = await supabase
        .from("club_members")
        .select("role")
        .eq("club_id", matchData.club_id)
        .eq("user_id", user.id)
        .maybeSingle();

      return data?.role || null;
    },
    enabled: !!matchData?.club_id && !!user?.id,
  });

  const isAdminOrEditor =
    userPermissions === "admin" || userPermissions === "editor";

  // Check if the game date is today
  const isToday = () => {
    if (!matchData) return false;
    const gameDate = new Date(matchData.date);
    const today = new Date();
    return gameDate.toDateString() === today.toDateString();
  };

  const canEdit = isAdminOrEditor && isToday();

  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const handleSaveChanges = async () => {
    if (!matchData) return;

    try {
      // Update match scores
      for (const game of editedGames) {
        const { error: gameError } = await supabase
          .from("matches")
          .update({
            team_a_score: game.team_a_score,
            team_b_score: game.team_b_score,
          })
          .eq("id", game.id);

        if (gameError) throw gameError;
      }

      toast({
        title: "Changes saved",
        description: "The match details have been updated.",
      });

      setEditing(false);
      refetch(); // Refresh the data
    } catch (error) {
      console.error("Error saving changes:", error);
      toast({
        title: "Error",
        description: "Failed to save changes. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMatch = async () => {
    if (!matchData) return;

    try {
      // Delete the match day (this should cascade delete matches and game_players)
      const { error } = await supabase
        .from("match_days")
        .delete()
        .eq("id", matchData.id);

      if (error) throw error;

      toast({
        title: "Match deleted",
        description: "The match has been deleted.",
      });

      navigate(`/games/${matchData.club_id}`);
    } catch (error) {
      console.error("Error deleting match:", error);
      toast({
        title: "Error",
        description: "Failed to delete match. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleScoreChange = (
    gameIndex: number,
    team: "team_a_score" | "team_b_score",
    value: string
  ) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      const newGames = [...editedGames];
      newGames[gameIndex] = {
        ...newGames[gameIndex],
        [team]: numValue,
      };
      setEditedGames(newGames);
    }
  };

  const handleCreateSameTeams = async () => {
    if (!matchData || !user?.id) return;

    try {
      // console. log("=== CREATING GAME WITH SAME TEAMS ===");
      // console. log("Original match data:", matchData);

      // 1. Create a new match day for today
      const { data: matchDay, error: matchDayError } = await supabase
        .from("match_days")
        .insert({
          date: format(new Date(), "yyyy-MM-dd"), // Today's date
          created_by: user.id,
          club_id: matchData.club_id,
          team_generated: true,
        })
        .select()
        .single();

      if (matchDayError) {
        console.error("Match day error:", matchDayError);
        throw matchDayError;
      }

      // console. log("Created new match day:", matchDay);

      // 2. Create 5 matches for the 5 sets (all starting at 0-0)
      const matches = Array.from({ length: 5 }, (_, index) => ({
        match_day_id: matchDay.id,
        game_number: index + 1,
        team_a_score: 0,
        team_b_score: 0,
        added_by_user_id: user.id,
      }));

      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .insert(matches)
        .select();

      if (matchesError) {
        console.error("Matches error:", matchesError);
        throw matchesError;
      }

      // console. log("Created matches:", matchesData);

      // 3. Copy the exact same team composition from the original game
      const gamePlayersToInsert = matchData.game_players.map(
        (originalPlayer) => ({
          match_day_id: matchDay.id,
          player_id: originalPlayer.player_id,
          team_name: originalPlayer.team_name,
          original_team_name: originalPlayer.team_name,
          manually_adjusted: false,
          position_played: originalPlayer.position_played,
        })
      );

      // console. log("Game players to insert:", gamePlayersToInsert);

      const { error: gamePlayersError } = await supabase
        .from("game_players")
        .insert(gamePlayersToInsert);

      if (gamePlayersError) {
        console.error("Game players error:", gamePlayersError);
        throw new Error(
          `Failed to create game players: ${gamePlayersError.message}`
        );
      }

      // console. log("=== GAME CREATED SUCCESSFULLY ===");

      // 4. Invalidate queries to refresh the dashboard
      await queryClient.invalidateQueries({
        queryKey: ["latestGame", matchData.club_id],
      });

      toast({
        title: "Game created!",
        description: "New game created with the same teams",
      });

      // 5. Navigate to dashboard
      navigate(`/dashboard/${matchData.club_id}`);
    } catch (error) {
      console.error("Error creating new game:", error);
      toast({
        title: "Error",
        description: "Failed to create new game. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Loading state
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

  // Error state
  if (error || !matchData) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Match not found</h2>
            <p className="text-gray-600 mb-4">
              The match you're looking for doesn't exist or you don't have
              access to it.
            </p>
            <Button onClick={() => navigate(-1)}>Go Back</Button>
          </div>
        </div>
      </div>
    );
  }

  // Process teams
  const teamAPlayers = matchData.game_players
    .filter((gp) => gp.team_name === "team_a")
    .map((gp) => ({
      id: gp.player_id,
      name: `${gp.players.first_name} ${gp.players.last_name}`,
      position: gp.position_played || "No Position",
    }));

  const teamBPlayers = matchData.game_players
    .filter((gp) => gp.team_name === "team_b")
    .map((gp) => ({
      id: gp.player_id,
      name: `${gp.players.first_name} ${gp.players.last_name}`,
      position: gp.position_played || "No Position",
    }));

  // Calculate match statistics
  const gamesPlayed = matchData.matches.filter(
    (match) => match.team_a_score + match.team_b_score > 0
  );

  const teamAWins = gamesPlayed.filter(
    (match) => match.team_a_score > match.team_b_score
  ).length;

  const teamBWins = gamesPlayed.filter(
    (match) => match.team_b_score > match.team_a_score
  ).length;

  const matchWinner =
    teamAWins > teamBWins
      ? "Team A"
      : teamBWins > teamAWins
      ? "Team B"
      : "Draw";

  const totalScore = {
    teamA: matchData.matches.reduce((sum, game) => sum + game.team_a_score, 0),
    teamB: matchData.matches.reduce((sum, game) => sum + game.team_b_score, 0),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header Section */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center">
              <Button
                variant="outline"
                size="icon"
                className="mr-4"
                onClick={() => navigate(`/games/${matchData.club_id}`)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Game Details</h1>
            </div>
            <div className="flex gap-2">
              {canEdit ? (
                <>
                  {editing ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditing(false);
                          setEditedGames([...matchData.matches]);
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                      <Button onClick={handleSaveChanges}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setEditing(true)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Match
                      </Button>
                      <Dialog
                        open={confirmDeleteOpen}
                        onOpenChange={setConfirmDeleteOpen}
                      >
                        <DialogTrigger asChild>
                          <Button variant="destructive">
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>
                              Are you sure you want to delete?
                            </DialogTitle>
                            <DialogDescription>
                              This action cannot be undone. This will
                              permanently delete the match and all associated
                              data.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setConfirmDeleteOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              variant="destructive"
                              onClick={handleDeleteMatch}
                            >
                              Delete
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </>
              ) : (
                <Button variant="outline" onClick={handleCreateSameTeams}>
                  Create Game w. same Teams
                </Button>
              )}
            </div>
          </div>

          {/* Main Match Card */}
          <Card className="mb-8">
            <CardContent className="p-6">
              {/* Match Info Row - Now includes Date, Final Score, and Winner */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="flex items-top">
                  <Calendar className="h-5 w-5 mt-1 text-volleyball-primary mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">{formatDate(matchData.date)}</p>
                  </div>
                </div>
                <div className="flex items-top">
                  <Trophy className="h-5 w-5 mt-1 text-volleyball-primary mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Final Score</p>
                    <p className="font-medium text-lg">
                      <span
                        className={teamAWins > teamBWins ? "font-bold" : ""}
                      >
                        {teamAWins}
                      </span>
                      <span className="mx-2">-</span>
                      <span
                        className={teamBWins > teamAWins ? "font-bold" : ""}
                      >
                        {teamBWins}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-top">
                  <Trophy className="h-5 w-5 mt-1 text-volleyball-primary mr-2" />
                  <div>
                    <p className="text-sm text-gray-500">Winner</p>
                    <p className="font-medium">{matchWinner}</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="teams">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="teams">Teams</TabsTrigger>
                  <TabsTrigger value="games">Match Scores</TabsTrigger>
                </TabsList>

                <TabsContent value="teams">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center text-white text-xs mr-2">
                          A
                        </div>
                        Team A
                      </h3>
                      <ul className="space-y-2">
                        {teamAPlayers.map((player, index) => (
                          <li
                            key={player.id}
                            className="flex items-center p-2 bg-gray-50 rounded-md"
                          >
                            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {player.name.charAt(0)}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium">
                                {player.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {player.position}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs mr-2">
                          B
                        </div>
                        Team B
                      </h3>
                      <ul className="space-y-2">
                        {teamBPlayers.map((player, index) => (
                          <li
                            key={player.id}
                            className="flex items-center p-2 bg-gray-50 rounded-md"
                          >
                            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                              {player.name.charAt(0)}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium">
                                {player.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {player.position}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="games">
                  <div className="mt-6">
                    <div className="rounded-md border overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Game
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Team A
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Team B
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Winner
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(editing ? editedGames : matchData.matches)
                            .sort((a, b) => a.game_number - b.game_number)
                            .map((game, index) => (
                              <tr key={game.id}>
                                <td className="px-6 py-4 whitespace-nowrap font-medium">
                                  Match {game.game_number}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  {editing ? (
                                    <Input
                                      type="number"
                                      min="0"
                                      value={game.team_a_score}
                                      onChange={(e) =>
                                        handleScoreChange(
                                          index,
                                          "team_a_score",
                                          e.target.value
                                        )
                                      }
                                      className="w-16 inline-block text-right"
                                    />
                                  ) : (
                                    <span
                                      className={
                                        game.team_a_score > game.team_b_score
                                          ? "font-bold text-red-600"
                                          : ""
                                      }
                                    >
                                      {game.team_a_score}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                  {editing ? (
                                    <Input
                                      type="number"
                                      min="0"
                                      value={game.team_b_score}
                                      onChange={(e) =>
                                        handleScoreChange(
                                          index,
                                          "team_b_score",
                                          e.target.value
                                        )
                                      }
                                      className="w-16 inline-block text-right"
                                    />
                                  ) : (
                                    <span
                                      className={
                                        game.team_b_score > game.team_a_score
                                          ? "font-bold text-emerald-600"
                                          : ""
                                      }
                                    >
                                      {game.team_b_score}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {game.team_a_score + game.team_b_score > 0 ? (
                                    <span
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        game.team_a_score > game.team_b_score
                                          ? "bg-red-500/10 text-red-600"
                                          : game.team_b_score >
                                            game.team_a_score
                                          ? "bg-emerald-500/10 text-emerald-600"
                                          : "bg-gray-100 text-gray-600"
                                      }`}
                                    >
                                      {game.team_a_score > game.team_b_score
                                        ? "Team A"
                                        : game.team_b_score > game.team_a_score
                                        ? "Team B"
                                        : "Tie"}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-xs">
                                      Not played
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          <tr className="bg-gray-50 font-semibold">
                            <td className="px-6 py-4 whitespace-nowrap">
                              Total Points
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {totalScore.teamA}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              {totalScore.teamB}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  matchWinner === "Team A"
                                    ? "bg-red-500/10 text-red-600"
                                    : matchWinner === "Team B"
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {matchWinner}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default GameDetail;
