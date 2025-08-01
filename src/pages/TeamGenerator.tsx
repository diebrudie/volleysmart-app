
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PlayersSelection } from '@/components/team-generator/PlayersSelection';
import { GeneratedTeams } from '@/components/team-generator/GeneratedTeams';
import { EmptyTeamsState } from '@/components/team-generator/EmptyTeamsState';
import { PlayerWithPositions } from '@/components/team-generator/types';

// Define player types for team generation logic
type PlayerPosition = 'Setter' | 'Outside Hitter' | 'Middle Blocker' | 'Opposite Hitter' | 'Libero';

const TeamGenerator = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [generatedTeams, setGeneratedTeams] = useState<{ teamA: PlayerWithPositions[]; teamB: PlayerWithPositions[] } | null>(null);
  const [allPlayers, setAllPlayers] = useState<PlayerWithPositions[]>([]);
  
  const canGenerateTeams = selectedPlayers.length >= 6;
  
  const handlePlayerSelection = (playerId: string) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(selectedPlayers.filter(id => id !== playerId));
    } else {
      setSelectedPlayers([...selectedPlayers, playerId]);
    }
  };

  // Helper function to group players by position
  const groupPlayersByPosition = (players: PlayerWithPositions[]) => {
    const groups: Record<string, PlayerWithPositions[]> = {
      'Setter': [],
      'Outside Hitter': [],
      'Middle Blocker': [],
      'Opposite Hitter': [],
      'Libero': []
    };
    
    players.forEach(player => {
      const position = player.preferredPosition;
      if (groups[position]) {
        groups[position].push(player);
      } else {
        // If player has a position that's not in our predefined groups,
        // create a new group for it
        groups[position] = [player];
      }
    });
    
    return groups;
  };

  // Helper to sort players by skill within a position group
  const sortPlayersBySkill = (players: PlayerWithPositions[]) => {
    return [...players].sort((a, b) => b.skill_rating - a.skill_rating);
  };

  // This function will attempt to balance gender distribution
  const balanceGenderDistribution = (teamA: PlayerWithPositions[], teamB: PlayerWithPositions[]) => {
    let malesTeamA = teamA.filter(p => p.gender === 'male').length;
    let femalesTeamA = teamA.filter(p => p.gender === 'female').length;
    let malesTeamB = teamB.filter(p => p.gender === 'male').length;
    let femalesTeamB = teamB.filter(p => p.gender === 'female').length;
    
    // If the gender distribution is already balanced (or close enough), return
    if (Math.abs((malesTeamA - femalesTeamA) - (malesTeamB - femalesTeamB)) <= 1) {
      return { teamA, teamB };
    }
    
    // Try to swap some players to balance gender
    for (let i = 0; i < teamA.length; i++) {
      for (let j = 0; j < teamB.length; j++) {
        const playerA = teamA[i];
        const playerB = teamB[j];
        
        // Only consider swapping if players have the same preferred position
        if (playerA.preferredPosition === playerB.preferredPosition &&
            playerA.gender !== playerB.gender) {
          
          // Calculate how the swap would affect gender distribution
          const newMalesA = malesTeamA + (playerB.gender === 'male' ? 1 : -1);
          const newFemalesA = femalesTeamA + (playerB.gender === 'female' ? 1 : -1);
          const newMalesB = malesTeamB + (playerA.gender === 'male' ? 1 : -1);
          const newFemalesB = femalesTeamB + (playerA.gender === 'female' ? 1 : -1);
          
          const currentDiff = Math.abs((malesTeamA - femalesTeamA) - (malesTeamB - femalesTeamB));
          const newDiff = Math.abs((newMalesA - newFemalesA) - (newMalesB - newFemalesB));
          
          // If the swap improves balance, do it
          if (newDiff < currentDiff) {
            const temp = teamA[i];
            teamA[i] = teamB[j];
            teamB[j] = temp;
            
            // Update counts
            malesTeamA = newMalesA;
            femalesTeamA = newFemalesA;
            malesTeamB = newMalesB;
            femalesTeamB = newFemalesB;
            
            // If we've achieved good balance, we can stop
            if (newDiff <= 1) {
              return { teamA, teamB };
            }
          }
        }
      }
    }
    
    return { teamA, teamB };
  };

  const generateTeams = () => {
    if (selectedPlayers.length < 6) {
      toast({
        title: "Not enough players",
        description: "Please select at least 6 players to generate teams.",
        variant: "destructive"
      });
      return;
    }
    
    // Get the selected player objects with explicit typing
    const players = selectedPlayers.map(id => 
      allPlayers.find(p => p.id === id)
    ).filter(p => p !== undefined) as PlayerWithPositions[];
    
    // Group players by their preferred positions
    const positionGroups = groupPlayersByPosition(players);
    
    // Sort each group by skill rating
    Object.keys(positionGroups).forEach(pos => {
      positionGroups[pos] = sortPlayersBySkill(positionGroups[pos]);
    });
    
    // Initialize teams
    const teamA: PlayerWithPositions[] = [];
    const teamB: PlayerWithPositions[] = [];
    
    // Start by distributing the key positions based on skill
    // We'll assign players in alternating fashion to balance skill
    
    // Distribute Setters (1-2 per team)
    const setters = positionGroups['Setter'];
    for (let i = 0; i < Math.min(setters.length, 4); i++) {
      if (i % 2 === 0) teamA.push(setters[i]);
      else teamB.push(setters[i]);
    }
    
    // Distribute Outside Hitters (2 per team ideally)
    const outsideHitters = positionGroups['Outside Hitter'];
    for (let i = 0; i < Math.min(outsideHitters.length, 4); i++) {
      if (i % 2 === 0) teamA.push(outsideHitters[i]);
      else teamB.push(outsideHitters[i]);
    }
    
    // Distribute Middle Blockers (2 per team ideally)
    const middleBlockers = positionGroups['Middle Blocker'];
    for (let i = 0; i < Math.min(middleBlockers.length, 4); i++) {
      if (i % 2 === 0) teamA.push(middleBlockers[i]);
      else teamB.push(middleBlockers[i]);
    }
    
    // Distribute Liberos (1 per team ideally)
    const liberos = positionGroups['Libero'];
    for (let i = 0; i < Math.min(liberos.length, 2); i++) {
      if (i % 2 === 0) teamA.push(liberos[i]);
      else teamB.push(liberos[i]);
    }
    
    // Distribute Opposite Hitters
    const oppositeHitters = positionGroups['Opposite Hitter'];
    for (let i = 0; i < Math.min(oppositeHitters.length, 2); i++) {
      if (i % 2 === 0) teamA.push(oppositeHitters[i]);
      else teamB.push(oppositeHitters[i]);
    }
    
    // Distribute any remaining players to balance team sizes
    const assignedPlayers = new Set([
      ...teamA.map(p => p.id),
      ...teamB.map(p => p.id)
    ]);
    
    const remainingPlayers = players.filter(p => !assignedPlayers.has(p.id));
    
    // Simple alternating assignment for remaining players
    for (let i = 0; i < remainingPlayers.length; i++) {
      if (teamA.length <= teamB.length) {
        teamA.push(remainingPlayers[i]);
      } else {
        teamB.push(remainingPlayers[i]);
      }
    }
    
    // Try to balance gender distribution
    const balancedTeams = balanceGenderDistribution(teamA, teamB);
    
    setGeneratedTeams({
      teamA: balancedTeams.teamA,
      teamB: balancedTeams.teamB
    });
    
    toast({
      title: "Teams generated",
      description: `Created 2 teams with balanced positions and skill levels.`,
    });
  };

  const regenerateTeams = () => {
    generateTeams();
    toast({
      title: "Teams regenerated",
      description: "New teams have been created with the same players.",
    });
  };

  const updateTeams = (newTeams: { teamA: PlayerWithPositions[]; teamB: PlayerWithPositions[] }) => {
    setGeneratedTeams(newTeams);
    toast({
      title: "Teams updated",
      description: "Team composition has been manually updated.",
    });
  };

  const handleSaveMatch = (matchDetails: { date: string; location: string; notes: string }) => {
    // In a real app, this would save the teams and match details to the database
    toast({
      title: "Match day saved",
      description: "New match day has been created with these teams.",
    });
    // Navigate to the match day detail page would happen here
  };

  const handleClearSelection = () => {
    setSelectedPlayers([]);
  };

  const handleInviteMembers = () => {
    navigate('/invite-members');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Team Generator</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Player Selection Section */}
            <div className="lg:col-span-1">
              <PlayersSelection
                selectedPlayers={selectedPlayers}
                onPlayerSelection={handlePlayerSelection}
                onGenerateTeams={generateTeams}
                canGenerateTeams={canGenerateTeams}
                onClearSelection={handleClearSelection}
                onPlayersLoaded={setAllPlayers}
              />
            </div>
            
            {/* Generated Teams Section */}
            <div className="lg:col-span-2">
              {generatedTeams ? (
                <GeneratedTeams
                  teams={{
                    teamA: generatedTeams.teamA.map(p => ({
                      id: Number(p.id.split('-')[0]) || 1,
                      name: p.name,
                      email: p.email || '',
                      positions: [p.preferredPosition],
                      preferredPosition: p.preferredPosition,
                      availability: true,
                      matchesPlayed: 0,
                      skillRating: p.skill_rating,
                      isPublic: true,
                      gender: p.gender,
                    })),
                    teamB: generatedTeams.teamB.map(p => ({
                      id: Number(p.id.split('-')[0]) || 1,
                      name: p.name,
                      email: p.email || '',
                      positions: [p.preferredPosition],
                      preferredPosition: p.preferredPosition,
                      availability: true,
                      matchesPlayed: 0,
                      skillRating: p.skill_rating,
                      isPublic: true,
                      gender: p.gender,
                    }))
                  }}
                  onRegenerateTeams={regenerateTeams}
                  onUpdateTeams={(newTeams) => {
                    // Convert back to PlayerWithPositions format
                    const convertedTeams = {
                      teamA: newTeams.teamA.map(p => allPlayers.find(ap => ap.name === p.name) || allPlayers[0]),
                      teamB: newTeams.teamB.map(p => allPlayers.find(ap => ap.name === p.name) || allPlayers[0])
                    };
                    updateTeams(convertedTeams);
                  }}
                  onSaveMatch={handleSaveMatch}
                />
              ) : (
                <EmptyTeamsState
                  canGenerateTeams={canGenerateTeams}
                  onGenerateTeams={generateTeams}
                  onInviteMembers={handleInviteMembers}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default TeamGenerator;
