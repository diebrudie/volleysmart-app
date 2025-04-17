import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Edit, Save, Shuffle } from "lucide-react";
import { TeamTable } from "./TeamTable";
import { SaveMatchDialog } from "./SaveMatchDialog";
import { TeamEditDialog } from "./TeamEditDialog";
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
  onUpdateTeams: (teams: { teamA: Player[]; teamB: Player[] }) => void;
  onSaveMatch: (matchDetails: { date: string; location: string; notes: string }) => void;
}

export const GeneratedTeams = ({ 
  teams, 
  onRegenerateTeams, 
  onUpdateTeams,
  onSaveMatch 
}: GeneratedTeamsProps) => {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

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
    <Card className="relative">
      <Button 
        variant="ghost" 
        size="icon" 
        className="absolute top-2 right-2 z-10"
        onClick={() => setEditDialogOpen(true)}
      >
        <Edit className="h-5 w-5 text-gray-500 hover:text-gray-700" />
      </Button>

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
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" onClick={copyTeams}>
              <Copy className="mr-2 h-4 w-4" />
              Copy
            </Button>
            <Button variant="default" onClick={() => setSaveDialogOpen(true)}>
              <Save className="mr-2 h-4 w-4" />
              Save
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
          <TeamTable 
            team={teams.teamA} 
            teamLetter="A" 
            colorClass="volleyball-primary" 
          />
          
          <TeamTable 
            team={teams.teamB} 
            teamLetter="B" 
            colorClass="volleyball-accent" 
          />
        </div>
      </CardContent>
      
      <TeamEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        teams={teams}
        onUpdateTeams={onUpdateTeams}
        onRandomizeTeams={onRegenerateTeams}
      />
    </Card>
  );
};
