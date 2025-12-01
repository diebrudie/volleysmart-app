/**
 * PlayersEditModal
 * Reusable modal to edit the selection of players for an existing game.
 * - Lists club members with search, includes "Add guests" control like /new-game
 * - Preselects already-in-game players
 * - Returns the *final selection* (regular players + guests with their requested names/skills/positions)
 *
 * NOTE:
 * - This component does not write to DB. It reports back the user's intended selection.
 * - Caller (EditGame.tsx) decides how to apply the delta (add/remove) to local teams and later persist.
 */

import { useEffect, useMemo, useState } from "react";
import { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Minus, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { fetchActiveMembersBasic } from "@/integrations/supabase/clubMembers";
import {
  GuestNameSelector,
  GuestSummary,
} from "@/components/forms/GuestNameSelector";

// Minimal shape for a joined row from players -> player_positions -> positions
type PlayerPositionsRow = {
  is_primary: boolean;
  position_id: string;
  positions: { id: string; name: string };
};

type PlayersSelectRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  user_id: string | null;
  skill_rating: number | null;
  gender: string | null;
  height_cm: number | null;
  player_positions?: PlayerPositionsRow[];
};

type ClubMember = {
  id: string;
  first_name: string;
  last_name: string;
  user_id: string;
  primary_position_id: string | null;
  primary_position_name: string;
  skill_rating: number;
  gender: string;
  height_cm: number | null;
  isExtraPlayer: false;
};

type ExtraPlayerDraft = {
  id: string; // local temp id: "extra-..."
  name: string; // guest first_name (no spaces)
  skill_rating: number;
  position:
    | "Setter"
    | "Outside Hitter"
    | "Middle Blocker"
    | "Opposite"
    | "Libero";
  isExtraPlayer: true;
  /**
   * If set, this extra refers to an existing guest player's id (UUID) and should NOT call createOrReuseGuestByName.
   * If undefined/null, the name should be treated as a new guest first_name with last_name = "Player".
   */
  existingPlayerId?: string | null;
};

// Discriminated union for list rendering
type PlayerDisplay = ClubMember | ExtraPlayerDraft;

function isExtra(p: PlayerDisplay): p is ExtraPlayerDraft {
  return p.isExtraPlayer === true;
}

export type PlayersEditResult = {
  selectedRegularIds: string[];
  guestDrafts: ExtraPlayerDraft[];
};

interface PlayersEditModalProps {
  clubId: string;
  open: boolean;
  initialSelectedPlayerIds: string[]; // existing game players to preselect
  onCancel: () => void;
  onSave: (result: PlayersEditResult) => void;
}

const VOLLEYBALL_POSITIONS = [
  "Setter",
  "Outside Hitter",
  "Middle Blocker",
  "Opposite",
  "Libero",
] as const;

export function PlayersEditModal({
  clubId,
  open,
  initialSelectedPlayerIds,
  onCancel,
  onSave,
}: PlayersEditModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  const [extraPlayers, setExtraPlayers] = useState<ExtraPlayerDraft[]>([]);

  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialSelectedPlayerIds
  );

  const headerRef = useRef<HTMLDivElement | null>(null);

  const setExtraFromExisting = (id: string, guest: GuestSummary) => {
    const sanitizedFirst = guest.first_name.replace(/\s+/g, "");
    setExtraPlayers((cur) =>
      cur.map((e) =>
        e.id === id
          ? {
              ...e,
              name: sanitizedFirst,
              existingPlayerId: guest.player_id,
            }
          : e
      )
    );
  };

  useEffect(() => {
    if (!isSearchExpanded) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setIsSearchExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isSearchExpanded]);

  useEffect(() => {
    setSelectedIds(initialSelectedPlayerIds);
  }, [initialSelectedPlayerIds, open]);

  useEffect(() => {
    if (!open) return;
    let active = true;

    (async () => {
      setIsLoading(true);
      try {
        const membershipRows = await fetchActiveMembersBasic(clubId);
        if (!active) return;

        // 1) Load active club members via user_id → players
        const userIds = membershipRows.map((mm) => mm.user_id).filter(Boolean);
        let processed: ClubMember[] = [];

        if (userIds.length > 0) {
          const { data: playersData, error: playersError } = await supabase
            .from("players")
            .select(
              `id, first_name, last_name, user_id, skill_rating, gender, height_cm,
               player_positions!inner (is_primary, position_id, positions (id, name))`
            )
            .in("user_id", userIds);

          if (playersError) throw playersError;

          processed = ((playersData as PlayersSelectRow[] | null) ?? []).map(
            (p) => {
              const primary =
                (p.player_positions ?? []).find((pp) => pp.is_primary) ?? null;

              return {
                id: p.id,
                first_name: p.first_name ?? "Player",
                last_name: p.last_name ?? "X",
                user_id: p.user_id ?? "",
                primary_position_id: primary ? primary.position_id : null,
                primary_position_name: primary
                  ? primary.positions.name
                  : "No Position",
                skill_rating: p.skill_rating ?? 50,
                gender: p.gender ?? "other",
                height_cm: p.height_cm,
                isExtraPlayer: false,
              };
            }
          );
        }

        // 2) Also include any players that are currently in the game
        //    but not part of the active members list (typically guests).
        const memberIds = new Set(processed.map((m) => m.id));
        const guestIds = initialSelectedPlayerIds.filter(
          (id) => !memberIds.has(id)
        );

        if (guestIds.length > 0) {
          const { data: guestPlayers, error: guestError } = await supabase
            .from("players")
            .select(
              `id, first_name, last_name, user_id, skill_rating, gender, height_cm`
            )
            .in("id", guestIds);

          if (guestError) throw guestError;

          const guestMembers: ClubMember[] = (
            (guestPlayers ?? []) as PlayersSelectRow[]
          ).map((p) => ({
            id: p.id,
            first_name: p.first_name ?? "Guest",
            last_name: p.last_name ?? "Guest",
            user_id: p.user_id ?? "",
            primary_position_id: null,
            primary_position_name: "Guest",
            skill_rating: p.skill_rating ?? 5,
            gender: p.gender ?? "other",
            height_cm: p.height_cm,
            isExtraPlayer: false,
          }));

          processed = [...processed, ...guestMembers];
        }

        setMembers(processed);
      } finally {
        if (active) setIsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [clubId, open, initialSelectedPlayerIds]);

  const allDisplay: PlayerDisplay[] = useMemo(() => {
    return [...members, ...extraPlayers];
  }, [members, extraPlayers]);

  const filtered: PlayerDisplay[] = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    if (!t) return allDisplay;
    return allDisplay.filter((p) => {
      if (isExtra(p)) {
        return p.name.toLowerCase().includes(t);
      }
      return `${p.first_name} ${p.last_name}`.toLowerCase().includes(t);
    });
  }, [allDisplay, searchTerm]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selectedIds.includes(p.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const ids = filtered.map((p) => p.id);
    const allSel = ids.every((id) => selectedIds.includes(id));
    if (allSel) {
      setSelectedIds((cur) => cur.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds((cur) => {
        const next = new Set(cur);
        ids.forEach((id) => next.add(id));
        return Array.from(next);
      });
    }
  };

  const addExtra = () => {
    const id = `extra-${Date.now()}-${Math.random()}`;
    setExtraPlayers((cur) => {
      const nextIndex = cur.length + 1;
      const defaultName = `Guest${nextIndex}`; // no spaces, will map to first_name = Guest{n}

      return [
        ...cur,
        {
          id,
          name: defaultName,
          skill_rating: 5,
          position: "Outside Hitter",
          isExtraPlayer: true,
          existingPlayerId: null,
        },
      ];
    });
    setSelectedIds((cur) => [...cur, id]);
  };

  const removeExtra = () => {
    setExtraPlayers((cur) => {
      if (cur.length === 0) return cur;
      const last = cur[cur.length - 1];
      setSelectedIds((sel) => sel.filter((id) => id !== last.id));
      return cur.slice(0, -1);
    });
  };

  const setExtraName = (id: string, name: string) => {
    const sanitized = name.replace(/\s+/g, "");
    setExtraPlayers((cur) =>
      cur.map((e) =>
        e.id === id ? { ...e, name: sanitized, existingPlayerId: null } : e
      )
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent
        className={cn(
          // Make the dialog itself a column flexbox so header, list, footer stay inside
          "p-0 [&>button:has(span.sr-only)]:hidden flex flex-col",
          // Mobile: true fullscreen
          "w-[100vw] max-w-[100vw] h-[100dvh] max-h-[100dvh] rounded-none",
          // Desktop: fixed viewport height so footer cannot overflow outside the card
          "sm:rounded-2xl sm:w-full sm:max-w-2xl sm:h-[85vh]"
        )}
      >
        {/* A11y-only title/description to satisfy Radix requirements without changing the visual header */}
        <DialogTitle className="sr-only">Edit Players</DialogTitle>
        <DialogDescription className="sr-only">
          Edit the list of players for this game. Search, select or deselect
          players, and add guests.
        </DialogDescription>

        {/* Full-bleed yellow header with fixed height */}
        <div ref={headerRef} className="bg-amber-500 relative rounded-t-md">
          {/* Keep a constant height so it doesn't grow/shrink when search toggles */}
          <div className="flex items-center justify-between px-4 sm:px-6 h-14">
            {/* Keep title space occupied even when search is open on mobile */}
            <h3
              className={cn(
                "text-base font-semibold text-black transition-opacity",
                // Use 'invisible' (not 'hidden') so the left block still takes space
                isSearchExpanded ? "invisible sm:visible" : "visible"
              )}
              aria-hidden={isSearchExpanded}
            >
              Edit Players
            </h3>

            {/* Right controls get a fixed width so alignment stays put */}
            <div className="relative flex items-center justify-end w-[180px] sm:w-[240px]">
              {/* Search input is absolutely positioned within this fixed-width area */}
              <Input
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus={isSearchExpanded}
                onBlur={() => {
                  if (!searchTerm) setIsSearchExpanded(false);
                }}
                className={cn(
                  "h-8 w-full absolute right-0 top-1/2 -translate-y-1/2 transition-opacity",
                  isSearchExpanded
                    ? "opacity-100 visible"
                    : "opacity-0 invisible"
                )}
              />

              {/* When search is closed, show the icons; they occupy same area */}
              <div
                className={cn(
                  "flex items-center gap-3 transition-opacity",
                  isSearchExpanded
                    ? "opacity-0 invisible"
                    : "opacity-100 visible"
                )}
              >
                <button
                  className="rounded p-1 hover:bg-black/10"
                  onClick={() => setIsSearchExpanded(true)}
                  aria-label="Search"
                >
                  <Search className="h-4 w-4 text-black dark:text-black/90" />
                </button>

                {filtered.length > 0 && (
                  <Checkbox
                    checked={allFilteredSelected}
                    onCheckedChange={handleSelectAllFiltered}
                    className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                    aria-label="Select all filtered"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add guests row with the same look as NewGame (contrast in dark) */}
        <div className="mx-4 sm:mx-6 py-3 border-b bg-card">
          <div className="bg-white dark:bg-gray-800 h-12 px-4 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Add guests
            </span>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={removeExtra}
                disabled={extraPlayers.length === 0}
                className="h-8 w-8"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-medium text-gray-900 dark:text-gray-100 min-w-[2rem] text-center">
                {extraPlayers.length}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={addExtra}
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Scrollable list; no outer padding, inner horizontal padding for rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-border bg-card">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No players found.
            </div>
          ) : (
            filtered.map((p) => {
              const checked = selectedIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  className={cn(
                    "px-4 sm:px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-accent/30"
                  )}
                  onClick={() => toggleSelect(p.id)}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      {isExtra(p) ? (
                        <GuestNameSelector
                          clubId={clubId}
                          value={p.name}
                          onValueChange={(newName) =>
                            setExtraName(p.id, newName)
                          }
                          onExistingGuestSelected={(guest) =>
                            setExtraFromExisting(p.id, guest)
                          }
                          className="max-w-[220px]"
                        />
                      ) : (
                        <span className="font-medium">
                          {`${p.first_name} ${p.last_name.charAt(0)}.`}
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-muted-foreground">
                      {isExtra(p)
                        ? `${p.position} (Level ${p.skill_rating}) • Guest`
                        : p.primary_position_name ?? "No Position"}
                    </span>
                  </div>
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleSelect(p.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="px-4 sm:px-6 pt-3 pb-[calc(theme(spacing.6)+env(safe-area-inset-bottom))] flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                selectedRegularIds: selectedIds.filter(
                  (id) => !id.startsWith("extra-")
                ),
                guestDrafts: extraPlayers.filter((ep) =>
                  selectedIds.includes(ep.id)
                ),
              })
            }
          >
            Save ({selectedIds.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
