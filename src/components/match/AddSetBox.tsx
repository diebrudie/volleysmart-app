/**
 * AddSetBox
 * Dashed, fully-clickable box to create a new Set. Same footprint as a small SetBox cell.
 * On mobile it appears below the last existing set because we place it last in DOM order.
 */
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddSetBoxProps {
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

export default function AddSetBox({
  onClick,
  className,
  disabled,
}: AddSetBoxProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        // Base box
        "h-full w-full rounded-lg border border-dashed",
        // Light
        "border-gray-300 bg-gray-50 hover:bg-gray-100",
        // Dark
        "dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800",
        // Layout/interaction
        "flex items-center justify-center p-6 transition-colors",
        // Focus (theme-aware)
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900",
        // Disabled
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
      aria-label="Add Set"
    >
      <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
        <Plus className="h-5 w-5" />
        <span className="font-medium">Add Set</span>
      </div>
    </button>
  );
}
