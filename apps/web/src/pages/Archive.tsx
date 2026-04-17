import * as React from "react";
import { Archive as ArchiveIcon } from "lucide-react";

/**
 * Phase 4 — Archive tab: cross-club past games table.
 * This shell will be fully implemented in feat/phase-4-archive-tab.
 */
const Archive: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
      <ArchiveIcon className="h-12 w-12 text-muted-foreground" />
      <div>
        <h1 className="text-xl font-semibold">Archive</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Past games from all your clubs will appear here.
        </p>
      </div>
    </div>
  );
};

export default Archive;
