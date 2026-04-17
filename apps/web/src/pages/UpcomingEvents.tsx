import * as React from "react";
import { CalendarDays } from "lucide-react";

/**
 * Phase 2 — Home tab: upcoming events across all clubs.
 * This shell will be fully implemented in feat/phase-2-home-upcoming-events.
 */
const UpcomingEvents: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
      <CalendarDays className="h-12 w-12 text-muted-foreground" />
      <div>
        <h1 className="text-xl font-semibold">Upcoming Events</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your scheduled games across all clubs will appear here.
        </p>
      </div>
    </div>
  );
};

export default UpcomingEvents;
