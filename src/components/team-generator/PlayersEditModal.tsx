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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Plus, Minus, Edit2, X } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { fetchActiveMembersBasic } from "@/integrations/supabase/clubMembers";

type ClubMember = {
  id: string;
  first_name: string;
  last_name: string;
  user_id: string;
  primary_position_id?: string | null;
  primary_position_name?: string;
  skill_rating?: number;
  gender?: string;
  height_cm?: number;
  isExtraPlayer: false;
};

type ExtraPlayerDraft = {
  id: string; // local temp id: "extra-..."
  name: string;
  skill_rating: number;
  position: string;
  isExtraPlayer: true;
};

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

        const processed: ClubMember[] = (playersData ?? []).map((p) => {
          const primary = p.player_positions?.find((pp: any) => pp.is_primary);
          return {
            id: p.id,
            first_name: p.first_name,
            last_name: p.last_name,
            user_id: p.user_id,
            primary_position_id: primary?.position_id ?? null,
            primary_position_name: primary?.positions?.name ?? "No Position",
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

  const allDisplay = useMemo(() => {
    return [...members, ...extraPlayers];
  }, [members, extraPlayers]);

  const filtered = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    if (!t) return allDisplay;
    return allDisplay.filter((p) => {
      if ((p as any).isExtraPlayer) {
        return (p as ExtraPlayerDraft).name.toLowerCase().includes(t);
      }
      const m = p as ClubMember;
      return `${m.first_name} ${m.last_name}`.toLowerCase().includes(t);
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
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Edit Players</DialogTitle>
        </DialogHeader>

        {/* Toolbar */}
        <div className="px-6 pb-3 flex items-center justify-between gap-3">
          {/* Search */}
          {isSearchExpanded ? (
            <Input
              placeholder="Search players…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              onBlur={() => {
                if (!searchTerm) setIsSearchExpanded(false);
              }}
              className="w-56"
            />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchExpanded(true)}
            >
              <Search className="h-4 w-4" />
            </Button>
          )}

          {/* Guests control */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Add guests</span>
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

          {/* Select-all for filtered */}
          {filtered.length > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allFilteredSelected}
                onCheckedChange={handleSelectAllFiltered}
              />
            </div>
          )}
        </div>

        {/* List */}
        <div className="max-h-[60vh] overflow-y-auto divide-y">
          {isLoading ? (
            <div className="py-12 flex items-center justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No players found.
            </div>
          ) : (
            filtered.map((p) => {
              const isExtra = (p as any).isExtraPlayer === true;
              const checked = selectedIds.includes(p.id);
              return (
                <div
                  key={p.id}
                  className={cn(
                    "px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-accent/30",
                    isExtra &&
                      "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-500"
                  )}
                  onClick={() => toggleSelect(p.id)}
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      {isExtra && editingExtraId === p.id ? (
                        <Input
                          value={(p as ExtraPlayerDraft).name}
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
                              isExtra && "text-blue-700 dark:text-blue-300"
                            )}
                          >
                            {isExtra
                              ? (p as ExtraPlayerDraft).name
                              : `${(p as ClubMember).first_name} ${(
                                  p as ClubMember
                                ).last_name.charAt(0)}.`}
                          </span>
                          {isExtra && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingExtraId(p.id);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                    <span className={cn("text-xs text-muted-foreground")}>
                      {isExtra
                        ? `${(p as ExtraPlayerDraft).position} (Level ${
                            (p as ExtraPlayerDraft).skill_rating
                          }) • Guest`
                        : (p as ClubMember).primary_position_name ??
                          "No Position"}
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

        <DialogFooter className="px-6 py-4">
          <Button variant="outline" onClick={onCancel}>
            Close
            <X className="h-4 w-4 ml-1" />
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
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
