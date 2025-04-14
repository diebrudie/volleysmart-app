
import React from 'react';
import { Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SetBoxProps {
  setNumber: number;
  teamAScore?: number | null;
  teamBScore?: number | null;
  onScoreUpdate?: (setNumber: number, teamAScore: number, teamBScore: number) => void;
}

const SetBox: React.FC<SetBoxProps> = ({ 
  setNumber, 
  teamAScore = null, 
  teamBScore = null,
  onScoreUpdate
}) => {
  const [localTeamAScore, setLocalTeamAScore] = useState<number>(teamAScore || 0);
  const [localTeamBScore, setLocalTeamBScore] = useState<number>(teamBScore || 0);
  const [isOpen, setIsOpen] = useState(false);
  
  // Determine if the set has been played (both scores are provided)
  const hasBeenPlayed = teamAScore !== null && teamBScore !== null && 
                        (teamAScore > 0 || teamBScore > 0);
  
  // Set opacity based on set number
  const getOpacity = () => {
    switch(setNumber) {
      case 1: return '0.3';
      case 2: return '0.45';
      case 3: return '0.6';
      case 4: return '0.75';
      case 5: return '0.9';
      default: return '0.6';
    }
  };

  // Get background color based on whether set has been played
  const getBackgroundColor = () => {
    if (hasBeenPlayed) {
      return `rgba(251, 190, 36, ${getOpacity()})`; // Yellow with opacity
    } else {
      return `rgba(216, 214, 211, ${getOpacity()})`; // Grey with opacity
    }
  };

  const handleSubmit = () => {
    if (onScoreUpdate) {
      onScoreUpdate(setNumber, localTeamAScore, localTeamBScore);
      setIsOpen(false);
    }
  };

  return (
    <div 
      className="rounded-lg p-6 flex flex-col items-center relative" 
      style={{ backgroundColor: getBackgroundColor() }}
    >
      <h3 className="text-xl font-serif mb-4 text-center">SET {setNumber}</h3>
      
      <div className="text-5xl font-bold mb-3 text-center">
        {hasBeenPlayed ? teamAScore : "0"} - {hasBeenPlayed ? teamBScore : "0"}
      </div>
      
      <p className="text-sm text-center">Team A vs. Team B</p>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button className="absolute top-2 right-2 p-1 hover:bg-black/10 rounded-md transition-colors">
            <Pencil className="h-5 w-5" />
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Set {setNumber} Score</DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <p className="text-sm font-medium mb-2">Team A</p>
                <input
                  type="number"
                  min="0"
                  value={localTeamAScore}
                  onChange={(e) => setLocalTeamAScore(parseInt(e.target.value) || 0)}
                  className="w-20 h-14 text-center text-2xl border rounded-md"
                />
              </div>
              
              <div className="text-2xl font-medium">vs.</div>
              
              <div className="text-center">
                <p className="text-sm font-medium mb-2">Team B</p>
                <input
                  type="number"
                  min="0"
                  value={localTeamBScore}
                  onChange={(e) => setLocalTeamBScore(parseInt(e.target.value) || 0)}
                  className="w-20 h-14 text-center text-2xl border rounded-md"
                />
              </div>
            </div>
            
            <div className="flex justify-center">
              <Button onClick={handleSubmit}>Submit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SetBox;
