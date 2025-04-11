
import { useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PlayersSelection } from '@/components/team-generator/PlayersSelection';
import { GeneratedTeams } from '@/components/team-generator/GeneratedTeams';
import { EmptyTeamsState } from '@/components/team-generator/EmptyTeamsState';
import { allPlayers } from '@/components/team-generator/mockData';

const TeamGenerator = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [generatedTeams, setGeneratedTeams] = useState<{ teamA: any[]; teamB: any[] } | null>(null);
  
  const canGenerateTeams = selectedPlayers.length >= 6;
  
  const handlePlayerSelection = (playerId: number) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(selectedPlayers.filter(id => id !== playerId));
    } else {
      setSelectedPlayers([...selectedPlayers, playerId]);
    }
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
    
    // Get the selected player objects
    const players = selectedPlayers.map(id => allPlayers.find(p => p.id === id));
    
    // For this demo, we'll just split the players randomly, but in a real app 
    // this would use a more sophisticated algorithm for fair team generation
    const shuffled = [...players].sort(() => 0.5 - Math.random());
    
    const halfIndex = Math.ceil(shuffled.length / 2);
    
    setGeneratedTeams({
      teamA: shuffled.slice(0, halfIndex),
      teamB: shuffled.slice(halfIndex)
    });
    
    toast({
      title: "Teams generated",
      description: `Created 2 teams with ${Math.ceil(selectedPlayers.length / 2)} players each.`,
    });
  };

  const regenerateTeams = () => {
    generateTeams();
    toast({
      title: "Teams regenerated",
      description: "New teams have been created with the same players.",
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
                allPlayers={allPlayers}
                selectedPlayers={selectedPlayers}
                onPlayerSelection={handlePlayerSelection}
                onGenerateTeams={generateTeams}
                canGenerateTeams={canGenerateTeams}
                onClearSelection={handleClearSelection}
              />
            </div>
            
            {/* Generated Teams Section */}
            <div className="lg:col-span-2">
              {generatedTeams ? (
                <GeneratedTeams
                  teams={generatedTeams}
                  onRegenerateTeams={regenerateTeams}
                  onSaveMatch={handleSaveMatch}
                />
              ) : (
                <EmptyTeamsState
                  canGenerateTeams={canGenerateTeams}
                  onGenerateTeams={generateTeams}
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
