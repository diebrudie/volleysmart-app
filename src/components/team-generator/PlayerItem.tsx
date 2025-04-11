
import { Checkbox } from "@/components/ui/checkbox";
import { Star } from "./Star";

interface PlayerItemProps {
  player: {
    id: number;
    name: string;
    positions: string[];
    preferredPosition: string;
    skillRating: number;
    availability: boolean;
  };
  isSelected: boolean;
  onSelect: (playerId: number) => void;
}

export const PlayerItem = ({ player, isSelected, onSelect }: PlayerItemProps) => {
  return (
    <div 
      className={`flex items-center p-4 hover:bg-gray-50 transition-colors ${
        !player.availability ? 'opacity-50' : ''
      }`}
    >
      <Checkbox 
        id={`player-${player.id}`}
        checked={isSelected}
        onCheckedChange={() => onSelect(player.id)}
        disabled={!player.availability}
      />
      <div className="ml-3 flex-grow">
        <label 
          htmlFor={`player-${player.id}`}
          className="font-medium text-gray-900 cursor-pointer"
        >
          {player.name}
        </label>
        <div className="flex flex-wrap gap-1 mt-1">
          {player.positions.map(position => (
            <span 
              key={position} 
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                position === player.preferredPosition
                  ? 'bg-volleyball-primary/10 text-volleyball-primary'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {position}
              {position === player.preferredPosition && '*'}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(star => (
          <Star 
            key={star} 
            filled={star <= player.skillRating} 
          />
        ))}
      </div>
    </div>
  );
};
