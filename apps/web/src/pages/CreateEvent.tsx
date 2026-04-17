import * as React from "react";
import { CalendarPlus } from "lucide-react";

/**
 * Phase 3 — Create Event flow (multi-step form).
 * This shell will be fully implemented in feat/phase-3-create-event-fab.
 */
const CreateEvent: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
      <CalendarPlus className="h-12 w-12 text-muted-foreground" />
      <div>
        <h1 className="text-xl font-semibold">Create Event</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Schedule a game, training, or tournament for your club.
        </p>
      </div>
    </div>
  );
};

export default CreateEvent;
