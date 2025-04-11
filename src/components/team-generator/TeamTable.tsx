
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star } from "./Star";
import { cn } from "@/lib/utils";

interface Player {
  id: number;
  name: string;
  preferredPosition: string;
  skillRating: number;
}

interface TeamTableProps {
  team: Player[];
  teamLetter: 'A' | 'B';
  colorClass: string;
}

export const TeamTable = ({ team, teamLetter, colorClass }: TeamTableProps) => {
  return (
    <div className={cn(
      "p-6",
      teamLetter === 'A' ? "border-b md:border-b-0 md:border-r" : ""
    )}>
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <div className={cn(
          "h-6 w-6 rounded-full flex items-center justify-center text-white text-xs mr-2",
          colorClass === "volleyball-primary" ? "bg-volleyball-primary" : "bg-volleyball-accent"
        )}>
          {teamLetter}
        </div>
        Team {teamLetter}
      </h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Position</TableHead>
            <TableHead>Rating</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {team.map(player => (
            <TableRow key={player.id}>
              <TableCell className="font-medium">{player.name}</TableCell>
              <TableCell>
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                  colorClass === "volleyball-primary" 
                    ? "bg-volleyball-primary/10 text-volleyball-primary" 
                    : "bg-volleyball-accent/10 text-volleyball-accent"
                )}>
                  {player.preferredPosition}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                      key={star} 
                      filled={star <= player.skillRating} 
                      small
                    />
                  ))}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
