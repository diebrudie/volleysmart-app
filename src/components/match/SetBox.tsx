
import React, { useState, KeyboardEvent, useRef } from 'react';
import { Pencil } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SetBoxProps {
  setNumber: number;
  teamAScore?: number | null;
  teamBScore?: number | null;
  onScoreUpdate?: (setNumber: number, teamAScore: number, teamBScore: number) => void;
  isLarge?: boolean;
}

const SetBox: React.FC<SetBoxProps> = ({ 
  setNumber, 
  teamAScore = null, 
  teamBScore = null,
  onScoreUpdate,
  isLarge = false
}) => {
  const [localTeamAScore, setLocalTeamAScore] = useState<number>(teamAScore || 0);
  const [localTeamBScore, setLocalTeamBScore] = useState<number>(teamBScore || 0);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();
  const teamAInputRef = useRef<HTMLInputElement>(null);
  
  const hasBeenPlayed = teamAScore !== null && teamBScore !== null && 
                        (teamAScore > 0 || teamBScore > 0);
  
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

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isMobile) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDialogOpen = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      setTimeout(() => {
        if (teamAInputRef.current) {
          teamAInputRef.current.focus();
        }
      }, 100);
    }
  };

  return (
    <div 
      className={cn(
        "rounded-lg p-6 flex flex-col items-center justify-center relative h-full",
        isLarge && "p-10 md:p-12"
      )}
      style={{ backgroundColor: getBackgroundColor() }}
    >
      <h3 className={cn(
        "font-serif mb-4 text-center",
        isLarge ? "text-3xl" : "text-xl"
      )}>SET {setNumber}</h3>
      
      <div className={cn(
        "font-bold mb-3 text-center",
        isLarge ? "text-7xl" : "text-5xl"
      )}>
        {hasBeenPlayed ? teamAScore : "0"} - {hasBeenPlayed ? teamBScore : "0"}
      </div>
      
      <p className="text-sm text-center">Team A vs. Team B</p>
      
      <Dialog open={isOpen} onOpenChange={handleDialogOpen}>
        <DialogTrigger asChild>
          <button className="absolute top-2 right-2 p-1 hover:bg-black/10 rounded-md transition-colors">
            <Pencil className="h-5 w-5" />
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">Update Set {setNumber} Score</DialogTitle>
          </DialogHeader>
          
          <div className="py-6">
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <p className="text-sm font-medium mb-2 text-red-500">Team A</p>
                <input
                  ref={teamAInputRef}
                  type="number"
                  min="0"
                  value={localTeamAScore}
                  onChange={(e) => setLocalTeamAScore(parseInt(e.target.value) || 0)}
                  onKeyDown={handleKeyDown}
                  className="w-20 h-14 text-center text-2xl border-2 rounded-md border-red-500"
                />
              </div>
              
              <div className="text-2xl font-medium self-end">vs.</div>
              
              <div className="text-center">
                <p className="text-sm font-medium mb-2 text-emerald-500">Team B</p>
                <input
                  type="number"
                  min="0"
                  value={localTeamBScore}
                  onChange={(e) => setLocalTeamBScore(parseInt(e.target.value) || 0)}
                  onKeyDown={handleKeyDown}
                  className="w-20 h-14 text-center text-2xl border-2 rounded-md border-emerald-500"
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
