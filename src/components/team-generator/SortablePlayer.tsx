import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface Player {
  id: number;
  name: string;
  preferredPosition: string;
  skillRating: number;
}

interface SortablePlayerProps {
  id: string;
  player: Player;
  teamColor: string;
}

export const SortablePlayer = ({
  id,
  player,
  teamColor,
}: SortablePlayerProps) => {
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

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center p-2 rounded-md",
        isDragging ? "opacity-50 bg-gray-100" : "",
        "border"
      )}
      {...attributes}
    >
      <div className="cursor-grab px-1" {...listeners}>
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>

      <div className="ml-2 flex-grow">
        <span className="font-medium">{player.name}</span>
        {" - "}
        <span className="text-xs rounded px-1.5 py-0.5 bg-gray-200 text-black">
          {player.preferredPosition}
        </span>
      </div>
    </li>
  );
};
