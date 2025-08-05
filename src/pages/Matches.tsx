import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, X, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/contexts/ClubContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/layout/Navbar";
import { EmptyTeamsState } from "@/components/team-generator/EmptyTeamsState";
import { toast } from "sonner";

interface MatchData {
  id: string;
  date: string;
  team_a_wins: number;
  team_b_wins: number;
  total_games_played: number;
  winner: string;
  match_day_id: string;
}

const Matches = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clubId: contextClubId, setClubId } = useClub();
  const { clubId: urlClubId } = useParams<{ clubId: string }>();
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "ascending" | "descending";
  } | null>({ key: "date", direction: "descending" });
  const [filters, setFilters] = useState({
    winner: "all",
  });

  // New state for delete functionality
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Use URL clubId if available, otherwise use context
  const clubId = urlClubId || contextClubId;

  // Set clubId in context if it comes from URL
  useEffect(() => {
    if (urlClubId && urlClubId !== contextClubId) {
      setClubId(urlClubId);
    }
  }, [urlClubId, contextClubId, setClubId]);

  // Query to fetch all matches for the club
  const {
    data: matchesData = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["clubMatches", clubId],
    queryFn: async (): Promise<MatchData[]> => {
      if (!clubId) return [];

      console.log("=== FETCHING CLUB MATCHES ===");
      console.log("Club ID:", clubId);

      // Get all match days for this club with their matches
      const { data: matchDays, error: matchDayError } = await supabase
        .from("match_days")
        .select(
          `
          id,
          date,
          notes,
          matches (
            id,
            game_number,
            team_a_score,
            team_b_score
          )
        `
        )
        .eq("club_id", clubId)
        .order("date", { ascending: false });

      if (matchDayError) {
        console.error("Error fetching match days:", matchDayError);
        throw matchDayError;
      }

      console.log("Raw match days:", matchDays);

      // Process match days to calculate winners and game totals
      const processedMatches: MatchData[] = [];

      for (const matchDay of matchDays || []) {
        if (!matchDay.matches || matchDay.matches.length === 0) {
          continue; // Skip match days with no matches
        }

        // Calculate wins for each team
        let teamAWins = 0;
        let teamBWins = 0;
        let totalGamesPlayed = 0;

        matchDay.matches.forEach((match) => {
          const totalScore = match.team_a_score + match.team_b_score;
          const gameWasPlayed = totalScore > 0;

          if (gameWasPlayed) {
            totalGamesPlayed++;
            if (match.team_a_score > match.team_b_score) {
              teamAWins++;
            } else if (match.team_b_score > match.team_a_score) {
              teamBWins++;
            }
          }
        });

        // Determine overall match winner
        let winner: string;
        if (totalGamesPlayed === 0) {
          continue;
        } else if (teamAWins > teamBWins) {
          winner = "Team A";
        } else if (teamBWins > teamAWins) {
          winner = "Team B";
        } else {
          winner = "Draw";
        }

        processedMatches.push({
          id: matchDay.id,
          date: matchDay.date,
          team_a_wins: teamAWins,
          team_b_wins: teamBWins,
          total_games_played: totalGamesPlayed,
          winner,
          match_day_id: matchDay.id,
        });
      }

      console.log("Processed matches:", processedMatches);
      return processedMatches;
    },
    enabled: !!clubId && !!user?.id,
  });

  // Query to check club member count and user role for empty state
  const { data: clubInfo } = useQuery({
    queryKey: ["clubInfo", clubId],
    queryFn: async () => {
      if (!clubId || !user?.id) return null;

      // Get member count
      const { count: memberCount } = await supabase
        .from("club_members")
        .select("*", { count: "exact", head: true })
        .eq("club_id", clubId);

      // Get user role
      const { data: memberData } = await supabase
        .from("club_members")
        .select("role")
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .maybeSingle();

      // Check if user is club creator
      const { data: clubData } = await supabase
        .from("clubs")
        .select("created_by, name")
        .eq("id", clubId)
        .single();

      const userRole =
        memberData?.role || (clubData?.created_by === user.id ? "admin" : null);

      return {
        memberCount: memberCount || 0,
        userRole,
        clubName: clubData?.name,
      };
    },
    enabled: !!clubId && !!user?.id,
  });

  // Check if current user is admin
  const isAdmin = clubInfo?.userRole === "admin";

  // Handle match selection for deletion
  const handleMatchSelection = (matchId: string, checked: boolean) => {
    if (checked) {
      setSelectedMatch(matchId);
    } else {
      setSelectedMatch(null);
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = () => {
    if (selectedMatch) {
      setShowDeleteDialog(true);
    }
  };

  // Delete match function
  // Delete match function
  const deleteMatch = async () => {
    if (!selectedMatch) return;

    setIsDeleting(true);

    try {
      console.log("=== DELETING MATCH ===");
      console.log("Match Day ID:", selectedMatch);

      // Delete in a transaction to ensure consistency
      const { error } = await supabase.rpc("delete_match_day_with_matches", {
        match_day_id: selectedMatch,
      });

      if (error) {
        console.error("Error deleting match day and matches:", error);
        throw error;
      }

      // Invalidate and refetch the matches query
      await queryClient.invalidateQueries({
        queryKey: ["clubMatches", clubId],
      });

      toast.success("Game deleted successfully");

      // Reset selection
      setSelectedMatch(null);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Failed to delete match:", error);
      toast.error("Failed to delete game. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };
  // Sort matches
  const sortedMatches = [...matchesData].sort((a, b) => {
    if (!sortConfig) return 0;

    if (sortConfig.key === "date") {
      return sortConfig.direction === "ascending"
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime();
    }

    // For other string fields
    if (
      a[sortConfig.key as keyof typeof a] < b[sortConfig.key as keyof typeof b]
    ) {
      return sortConfig.direction === "ascending" ? -1 : 1;
    }
    if (
      a[sortConfig.key as keyof typeof a] > b[sortConfig.key as keyof typeof b]
    ) {
      return sortConfig.direction === "ascending" ? 1 : -1;
    }
    return 0;
  });

  // Filter matches
  const filteredMatches = sortedMatches.filter((match) => {
    // Filter by month
    const matchDate = new Date(match.date);
    const matchesMonth =
      selectedMonth === "all" ||
      matchDate.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      }) === selectedMonth;

    // Filter by winner
    const matchesWinner =
      filters.winner === "all" || match.winner === filters.winner;

    return matchesMonth && matchesWinner;
  });

  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending";
    if (
      sortConfig &&
      sortConfig.key === key &&
      sortConfig.direction === "ascending"
    ) {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName: string) => {
    if (sortConfig?.key !== columnName) {
      return <ChevronDown className="h-4 w-4 ml-1 text-gray-400" />;
    }
    return sortConfig.direction === "ascending" ? (
      <ChevronUp className="h-4 w-4 ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 ml-1" />
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleInviteMembers = () => {
    if (clubId) {
      navigate(`/invite-members/${clubId}`);
    }
  };

  const handleCreateGame = () => {
    if (clubId) {
      navigate(`/new-game/${clubId}`);
    }
  };

  // Redirect to clubs page if no club context
  if (!clubId) {
    navigate("/clubs");
    return null;
  }

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
  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">
              Error loading matches
            </h2>
            <p className="text-gray-600">Please try refreshing the page.</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state - no matches played yet
  if (matchesData.length === 0) {
    const canGenerateTeams = (clubInfo?.memberCount || 0) >= 4;
    const canInviteMembers = clubInfo?.userRole === "admin";

    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-grow flex flex-col items-center justify-center p-4">
          <div className="max-w-lg w-full text-center">
            {clubInfo?.clubName && (
              <p className="text-lg text-gray-700 mb-4">
                Welcome to{" "}
                <span className="font-semibold">{clubInfo.clubName}</span>!
              </p>
            )}
            <h1 className="text-3xl font-bold mb-2">
              No games have been played yet.
            </h1>
            <p className="text-gray-600 mb-8">
              {canInviteMembers
                ? "Start by creating your first game or inviting more members:"
                : "Wait for the club admin to create a game or invite more members:"}
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>All Games Archive</CardTitle>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Select
                    value={selectedMonth}
                    onValueChange={(value) => setSelectedMonth(value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by Month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Months</SelectItem>
                      {Array.from(
                        new Set(
                          matchesData.map((match) =>
                            new Date(match.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                            })
                          )
                        )
                      )
                        .sort()
                        .map((month) => (
                          <SelectItem key={month} value={month}>
                            {month}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.winner}
                    onValueChange={(value) =>
                      setFilters({ ...filters, winner: value })
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Winner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Winners</SelectItem>
                      <SelectItem value="Team A">Team A</SelectItem>
                      <SelectItem value="Team B">Team B</SelectItem>
                      <SelectItem value="Draw">Draw</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {isAdmin && (
                        <TableHead className="w-[50px]">
                          <span className="sr-only">Select</span>
                        </TableHead>
                      )}
                      <TableHead className="w-[180px]">
                        <button
                          className="flex items-center hover:text-volleyball-primary transition-colors"
                          onClick={() => requestSort("date")}
                        >
                          Date {getSortIcon("date")}
                        </button>
                      </TableHead>
                      <TableHead className="text-center">
                        <span className="flex items-center justify-center">
                          Score
                        </span>
                      </TableHead>
                      <TableHead>
                        <button
                          className="flex items-center hover:text-volleyball-primary transition-colors"
                          onClick={() => requestSort("winner")}
                        >
                          Winner {getSortIcon("winner")}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMatches.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={isAdmin ? 5 : 4}
                          className="text-center py-8 text-gray-500"
                        >
                          No matches found. Try adjusting your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredMatches.map((match) => (
                        <TableRow key={match.id}>
                          {isAdmin && (
                            <TableCell>
                              <Checkbox
                                checked={selectedMatch === match.id}
                                onCheckedChange={(checked) =>
                                  handleMatchSelection(
                                    match.id,
                                    checked as boolean
                                  )
                                }
                              />
                            </TableCell>
                          )}
                          <TableCell className="font-medium">
                            {formatDate(match.date)}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {match.team_a_wins} - {match.team_b_wins}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                match.winner === "Team A"
                                  ? "bg-red-500/10 text-red-600"
                                  : match.winner === "Team B"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {match.winner}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link to={`/match-details/${match.match_day_id}`}>
                                <Button variant="outline" size="sm">
                                  View Details
                                </Button>
                              </Link>
                              {isAdmin && selectedMatch === match.id && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={handleDeleteClick}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Game</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this game? This action cannot be
              undone. All match data and scores will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedMatch(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteMatch}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Game
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Matches;
