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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Minus, Edit2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { fetchActiveMembersBasic } from "@/integrations/supabase/clubMembers";

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
  name: string;
  skill_rating: number;
  position:
    | "Setter"
    | "Outside Hitter"
    | "Middle Blocker"
    | "Opposite"
    | "Libero";
  isExtraPlayer: true;
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
  const [editingExtraId, setEditingExtraId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialSelectedPlayerIds
  );

  useEffect(() => {
    setSelectedIds(initialSelectedPlayerIds);
  }, [initialSelectedPlayerIds, open]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      setIsLoading(true);
      try {
        const m = await fetchActiveMembersBasic(clubId);
        if (!active) return;

        // resolve players attributes
        const userIds = m.map((mm) => mm.user_id).filter(Boolean);
        if (userIds.length === 0) {
          setMembers([]);
          return;
        }

        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select(
            `id, first_name, last_name, user_id, skill_rating, gender, height_cm,
             player_positions!inner (is_primary, position_id, positions (id, name))`
          )
          .in("user_id", userIds);

        if (playersError) throw playersError;

        const processed: ClubMember[] = (
          (playersData as PlayersSelectRow[] | null) ?? []
        ).map((p) => {
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
        });

        setMembers(processed);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [clubId, open]);

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
    setExtraPlayers((cur) => [
      ...cur,
      {
        id,
        name: "Guest Player",
        skill_rating: 5,
        position: "Outside Hitter",
        isExtraPlayer: true,
      },
    ]);
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
    setExtraPlayers((cur) =>
      cur.map((e) => (e.id === id ? { ...e, name } : e))
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-2xl p-0">
        {/* Top-right close (X) only */}
        <DialogClose asChild>
          <button
            aria-label="Close"
            className="absolute right-3 top-3 rounded-md p-1 hover:bg-accent"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </button>
        </DialogClose>

        {/* Full-bleed yellow header */}
        <div className="bg-amber-500 relative rounded-md">
          {/* Close button sits in the top area of the bar */}
          <DialogClose asChild>
            <button
              aria-label="Close"
              className="absolute right-3 top-3 rounded-md p-1 hover:bg-black/10"
              onClick={onCancel}
            >
              <X className="h-4 w-4 text-black" />
            </button>
          </DialogClose>

          {/* Controls row: title (mobile hides on search), search, select-all */}
          <div className="flex items-center justify-between px-4 sm:px-6 pt-10 pb-3">
            <h3
              className={cn(
                "text-base font-semibold text-black",
                isSearchExpanded ? "hidden sm:block" : "block"
              )}
            >
              Edit Players
            </h3>

            <div className="flex items-center gap-3">
              {isSearchExpanded ? (
                <Input
                  placeholder="Search players…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  onBlur={() => {
                    if (!searchTerm) setIsSearchExpanded(false);
                  }}
                  className="h-8 w-40 sm:w-56"
                />
              ) : (
                <button
                  className="rounded p-1 hover:bg-black/10"
                  onClick={() => setIsSearchExpanded(true)}
                  aria-label="Search"
                >
                  <Search className="h-4 w-4 text-black" />
                </button>
              )}

              {filtered.length > 0 && (
                <Checkbox
                  checked={allFilteredSelected}
                  onCheckedChange={handleSelectAllFiltered}
                  className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                />
              )}
            </div>
          </div>
        </div>

        {/* Add guests row directly under header, flush edges but padded inside */}
        <div className="px-4 sm:px-6 py-3 border-b bg-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Add guests</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={removeExtra}
                disabled={extraPlayers.length === 0}
                className="h-8 w-8"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-6 text-center">{extraPlayers.length}</span>
              <Button
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
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-border bg-card">
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
                      {isExtra(p) && editingExtraId === p.id ? (
                        <Input
                          value={p.name}
                          onChange={(e) => setExtraName(p.id, e.target.value)}
                          onBlur={() => setEditingExtraId(null)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setEditingExtraId(null);
                          }}
                          autoFocus
                          className="h-8 w-[200px]"
                        />
                      ) : (
                        <>
                          <span
                            className={cn(
                              "font-medium",
                              isExtra(p) && "text-blue-700 dark:text-blue-300"
                            )}
                          >
                            {isExtra(p)
                              ? p.name
                              : `${p.first_name} ${p.last_name.charAt(0)}.`}
                          </span>
                          {isExtra(p) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingExtraId(p.id);
                              }}
                              aria-label="Rename guest"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </>
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

        <DialogFooter className="px-4 sm:px-6 py-4">
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
