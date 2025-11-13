
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Save } from "lucide-react";

interface SaveMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveMatch: (matchDetails: { date: string; location: string; notes: string }) => void;
}

export const SaveMatchDialog = ({ open, onOpenChange, onSaveMatch }: SaveMatchDialogProps) => {
  const [matchDetails, setMatchDetails] = useState({
    date: new Date().toISOString().split('T')[0],
    location: "Main Gym",
    notes: ""
  });

  const handleSaveMatch = () => {
    onSaveMatch(matchDetails);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Save Match
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Match Day</DialogTitle>
          <DialogDescription>
            Enter details for this match day to save it.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="match-date" className="text-right">
              Date
            </Label>
            <Input
              id="match-date"
              type="date"
              className="col-span-3"
              value={matchDetails.date}
              onChange={(e) => setMatchDetails({...matchDetails, date: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="match-location" className="text-right">
              Location
            </Label>
            <Input
              id="match-location"
              className="col-span-3"
              value={matchDetails.location}
              onChange={(e) => setMatchDetails({...matchDetails, location: e.target.value})}
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="match-notes" className="text-right">
              Notes
            </Label>
            <Textarea
              id="match-notes"
              className="col-span-3"
              rows={3}
              value={matchDetails.notes}
              onChange={(e) => setMatchDetails({...matchDetails, notes: e.target.value})}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveMatch}>
            Save Match Day
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
