
import { Pencil } from "lucide-react";
import { format } from "date-fns";

interface MatchHeaderProps {
  date: string;
  isToday: boolean;
  isWednesday: boolean;
}

const MatchHeader = ({ date, isToday, isWednesday }: MatchHeaderProps) => {
  const formatDate = (dateString: string) => {
    const options = { 
      weekday: 'long' as const, 
      day: 'numeric' as const, 
      month: 'long' as const, 
      year: 'numeric' as const 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Determine which heading to display
  const headingText = (isToday && isWednesday) ? "Today's Game Overview" : "Last Game Overview";

  return (
    <div className="mb-8 flex justify-between items-center">
      <div>
        <h1 className="text-4xl font-serif mb-2">{headingText}</h1>
        <p className="text-gray-600">{formatDate(date)}</p>
      </div>
      <button className="flex items-center gap-1 text-sm font-medium">
        <Pencil className="h-4 w-4" /> Edit Teams
      </button>
    </div>
  );
};

export default MatchHeader;
