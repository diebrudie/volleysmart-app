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
  { id: "4", name: "Opposite Hitter" },
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
      // console.log("=== POSITION CHANGE DEBUG ===");
      // console.log("DnD ID:", id);
      // console.log("Actual Player ID:", actualPlayerId);
      // console.log("Old Position:", player.preferredPosition);
      // console.log("New Position:", tempPosition);

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
        "flex items-center p-2 rounded-md border bg-card text-card-foreground",
        isDragging ? "opacity-75 bg-muted" : ""
      )}
      {...attributes}
    >
      {/* Drag Handle — only this starts the drag */}
      <button
        type="button"
        aria-label="Drag to reorder"
        // The handle gets the listeners so ONLY it starts the drag
        {...dragListeners}
        className={cn(
          "px-1 touch-none", // touch-none prevents native scroll from stealing the gesture
          isEditingPosition
            ? "cursor-not-allowed opacity-50"
            : "cursor-grab active:cursor-grabbing"
        )}
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </button>

      {/* Player Info */}
      <div className="ml-2 flex-grow flex items-center justify-between">
        <div className="flex items-center">
          <span className="font-medium">{player.name}</span>
          <span className="mx-2">-</span>

          {/* Position Display/Edit */}
          <div className="flex items-center gap-2">
            {isEditingPosition ? (
              <div className="flex items-center gap-2">
                <Select value={tempPosition} onValueChange={handleSelectChange}>
                  <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs">
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
                  className="h-8 w-8 p-0"
                  onClick={handlePositionSave}
                >
                  <Check className="h-3 w-3 text-green-600" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={handlePositionCancel}
                >
                  <X className="h-3 w-3 text-red-600" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span
                  className="text-xs rounded px-1.5 py-0.5 bg-gray-200 text-black cursor-pointer hover:bg-gray-300 transition-colors"
                  onClick={handlePositionClick}
                  title="Click to edit position"
                >
                  {player.preferredPosition}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                  onClick={handlePositionClick}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </li>
  );
};
