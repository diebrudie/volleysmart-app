
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Save, Shuffle } from "lucide-react";
import { TeamTable } from "./TeamTable";
import { SaveMatchDialog } from "./SaveMatchDialog";
import { useState } from "react";

interface Player {
  id: number;
  name: string;
  positions: string[];
  preferredPosition: string;
  skillRating: number;
}

interface GeneratedTeamsProps {
  teams: {
    teamA: Player[];
    teamB: Player[];
  };
  onRegenerateTeams: () => void;
  onSaveMatch: (matchDetails: { date: string; location: string; notes: string }) => void;
}

export const GeneratedTeams = ({ 
  teams, 
  onRegenerateTeams, 
  onSaveMatch 
}: GeneratedTeamsProps) => {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  const copyTeams = () => {
    let text = "Volleyball Teams\n\n";
    
    text += "Team A:\n";
    teams.teamA.forEach(player => {
      text += `${player.name} (${player.preferredPosition})\n`;
    });
    
    text += "\nTeam B:\n";
    teams.teamB.forEach(player => {
      text += `${player.name} (${player.preferredPosition})\n`;
    });
    
    navigator.clipboard.writeText(text);
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Generated Teams</CardTitle>
            <CardDescription>
              {teams.teamA.length} players in Team A, {teams.teamB.length} players in Team B
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onRegenerateTeams}>
              <Shuffle className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
            <Button variant="outline" onClick={copyTeams}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <SaveMatchDialog 
              open={saveDialogOpen} 
              onOpenChange={setSaveDialogOpen} 
              onSaveMatch={onSaveMatch}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Team A */}
          <TeamTable 
            team={teams.teamA} 
            teamLetter="A" 
            colorClass="volleyball-primary" 
          />
          
          {/* Team B */}
          <div className="p-6">
            <TeamTable 
              team={teams.teamB} 
              teamLetter="B" 
              colorClass="volleyball-accent" 
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
