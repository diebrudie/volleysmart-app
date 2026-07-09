/**
 * Team assignment utilities — moved to @volleysmart/core (packages/core/src/teams).
 * Re-exported here so existing web imports keep working unchanged.
 */
export { assignLineup, assignTeams } from "@volleysmart/core";
export type {
  PlayerForAssignment,
  Assigned,
  PlayerForTeams,
  AssignedPlayer,
  TeamAssignmentResult,
} from "@volleysmart/core";
