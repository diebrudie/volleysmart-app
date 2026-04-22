import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Edit2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Player {
  id: number;
  name: string;
  preferredPosition: string;
  skillRating: number;
}

interface SortablePlayerProps {
  id: string; // This is the DnD ID like "A-123" or "B-456"
  player: Player;
  teamColor: string;
  onPositionChange?: (playerId: string, newPosition: string) => void;
  availablePositions?: Array<{ id: string; name: string }>;
}

const defaultPositions = [
  { id: "1", name: "Setter" },
  { id: "2", name: "Outside Hitter" },
  { id: "3", name: "Middle Blocker" },
  { id: "4", name: "Opposite" },
  { id: "5", name: "Libero" },
  { id: "6", name: "No Position" },
];

export const SortablePlayer = ({
  id,
  player,
  teamColor,
  onPositionChange,
  availablePositions = defaultPositions,
}: SortablePlayerProps) => {
  const [isEditingPosition, setIsEditingPosition] = useState(false);
  const [tempPosition, setTempPosition] = useState(player.preferredPosition);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handlePositionClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent drag from starting
    setIsEditingPosition(true);
    setTempPosition(player.preferredPosition);
  };

  const handlePositionSave = () => {
    if (onPositionChange && tempPosition !== player.preferredPosition) {
      // Extract the actual player ID from the DnD ID
      const actualPlayerId = id.replace(/^(A|B)-/, "");

      onPositionChange(actualPlayerId, tempPosition);
    }
    setIsEditingPosition(false);
  };

  const handlePositionCancel = () => {
    setTempPosition(player.preferredPosition);
    setIsEditingPosition(false);
  };

  const handleSelectChange = (value: string) => {
    setTempPosition(value);
  };

  // Prevent drag when interacting with position controls
  const dragListeners = isEditingPosition ? {} : listeners;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center px-3 py-3 bg-card",
        isDragging ? "opacity-75 bg-muted" : ""
      )}
      {...attributes}
    >
      {/* Drag Handle */}
      <button
        type="button"
        aria-label="Drag to reorder"
        {...dragListeners}
        className={cn(
          "shrink-0 touch-none",
          isEditingPosition
            ? "cursor-not-allowed opacity-50"
            : "cursor-grab active:cursor-grabbing"
        )}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Player Info */}
      <div className="ml-2 flex-grow flex items-center min-w-0">
        <span className="font-medium whitespace-nowrap">{player.name}</span>
        <span className="mx-1.5 text-muted-foreground">–</span>

        {/* Position Display/Edit */}
        {isEditingPosition ? (
          <div className="flex items-center gap-1.5">
            <Select value={tempPosition} onValueChange={handleSelectChange}>
              <SelectTrigger className="w-auto min-w-[120px] h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availablePositions.map((position) => (
                  <SelectItem key={position.id} value={position.name}>
                    {position.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={handlePositionSave}
            >
              <Check className="h-3 w-3 text-green-600" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
              onClick={handlePositionCancel}
            >
              <X className="h-3 w-3 text-red-600" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span
              className="text-xs rounded-md px-2 py-0.5 bg-foreground/85 text-background cursor-pointer hover:bg-foreground transition-colors whitespace-nowrap"
              onClick={handlePositionClick}
              title="Click to edit position"
            >
              {player.preferredPosition}
            </span>
            <button
              className="h-6 w-6 shrink-0 flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
              onClick={handlePositionClick}
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </li>
  );
};
