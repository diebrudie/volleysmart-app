import * as React from "react";
import { Users } from "lucide-react";

/**
 * Phase 6 — Members tab: cross-club member directory with filters.
 * This shell will be fully implemented in feat/phase-6-members-tab.
 */
const MembersGlobal: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
      <Users className="h-12 w-12 text-muted-foreground" />
      <div>
        <h1 className="text-xl font-semibold">Members</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          All members across your clubs, with filters and sorting.
        </p>
      </div>
    </div>
  );
};

export default MembersGlobal;
