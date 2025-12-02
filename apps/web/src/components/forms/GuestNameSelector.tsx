import { useState } from "react";
import { Check, ChevronDown, UserPlus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export type GuestSummary = {
  player_id: string;
  first_name: string;
  last_name: string;
  created_at: string;
  reused_at: string | null;
};

interface GuestNameSelectorProps {
  clubId: string;
  value: string;
  onValueChange: (value: string) => void;
  onExistingGuestSelected?: (guest: GuestSummary) => void;
  placeholder?: string;
  className?: string;
}

/**
 * GuestNameSelector
 *
 * - Shows a combobox of existing guests for a club.
 * - Allows typing a *new* guest first_name (no spaces).
 * - last_name for new guests is always "Player" (enforced in caller when saving).
 *
 * It does NOT write to DB; it only exposes:
 * - value: the current first_name text (no spaces)
 * - onExistingGuestSelected: callback when an existing guest is picked
 */
export const GuestNameSelector = ({
  clubId,
  value,
  onValueChange,
  onExistingGuestSelected,
  placeholder = "Search or type guest...",
  className,
}: GuestNameSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: guests = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["clubGuests", clubId],
    queryFn: async (): Promise<GuestSummary[]> => {
      if (!clubId) return [];

      const { data, error } = await supabase
        .from("guests")
        .select(
          `
          player_id,
          created_at,
          reused_at,
          players!inner (
            first_name,
            last_name
          )
        `
        )
        .eq("club_id", clubId)
        .order("reused_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching guests:", error);
        throw error;
      }

      const rows = (data ?? []) as {
        player_id: string;
        created_at: string;
        reused_at: string | null;
        players: { first_name: string | null; last_name: string | null };
      }[];

      return rows.map((row) => ({
        player_id: row.player_id,
        first_name: row.players.first_name ?? "Guest",
        last_name: row.players.last_name ?? "Player",
        created_at: row.created_at,
        reused_at: row.reused_at,
      }));
    },
    enabled: !!clubId,
  });

  const filteredGuests = guests.filter((guest) => {
    if (!searchQuery) return true;
    const full = `${guest.first_name} ${guest.last_name}`.toLowerCase();
    return full.includes(searchQuery.toLowerCase());
  });

  const exactMatch = guests.find(
    (guest) =>
      guest.first_name.toLowerCase() === searchQuery.toLowerCase() ||
      `${guest.first_name} ${guest.last_name}`.toLowerCase().trim() ===
        searchQuery.toLowerCase().trim()
  );

  const handleInputChange = (input: string) => {
    // Enforce "no spaces" invariant on the first_name field.
    const sanitized = input.replace(/\s+/g, "");
    setSearchQuery(sanitized);
    onValueChange(sanitized);
  };

  const handleSelectExisting = (guest: GuestSummary) => {
    onValueChange(guest.first_name.replace(/\s+/g, ""));
    if (onExistingGuestSelected) {
      onExistingGuestSelected(guest);
    }
    setOpen(false);
    setSearchQuery("");
  };

  const handleCreateNew = () => {
    if (!searchQuery.trim()) return;
    const sanitized = searchQuery.replace(/\s+/g, "");
    onValueChange(sanitized);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-8 px-2 justify-between border-gray-300 dark:border-gray-600 text-xs",
            !value && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <UserPlus className="h-3 w-3 text-gray-400" />
            {value ? value : placeholder}
          </div>
          <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type or search guest..."
            value={searchQuery}
            onValueChange={handleInputChange}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Spinner className="h-4 w-4" />
              </div>
            ) : error ? (
              <div className="py-4 text-center text-xs text-destructive">
                Failed to load guests
              </div>
            ) : (
              <>
                {filteredGuests.length > 0 ? (
                  <CommandGroup>
                    {filteredGuests.map((guest) => (
                      <CommandItem
                        key={guest.player_id}
                        value={guest.player_id}
                        onSelect={() => handleSelectExisting(guest)}
                        className="cursor-pointer text-xs"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-3 w-3",
                            value &&
                              value.toLowerCase() ===
                                guest.first_name.toLowerCase()
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        {guest.first_name} {guest.last_name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : (
                  <CommandEmpty>
                    {searchQuery ? "No guests found." : "No guests yet."}
                  </CommandEmpty>
                )}

                {searchQuery.trim() && !exactMatch && (
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleCreateNew}
                      className="cursor-pointer text-blue-600 dark:text-blue-400 text-xs"
                    >
                      <UserPlus className="mr-2 h-3 w-3" />
                      Create &quot;{searchQuery.trim()}&quot; Player
                    </CommandItem>
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
