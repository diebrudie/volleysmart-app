import { useState, useEffect } from "react";
import { Check, ChevronDown, Plus, MapPin, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  CommandSeparator,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LocationRecord {
  id: string;
  name: string;
  address: string | null;
  club_id: string | null;
}

interface MapboxFeature {
  id: string;
  text?: string;
  place_name?: string;
  center?: [number, number]; // [lng, lat]
  context?: Array<{ id: string; text: string; short_code?: string }>;
}

interface EventLocationSelectorProps {
  clubId: string | null;
  value: string | null;
  onValueChange: (locationId: string | null) => void;
  placeholder?: string;
}

export const EventLocationSelector = ({
  clubId,
  value,
  onValueChange,
  placeholder = "Search or select location...",
}: EventLocationSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapboxResults, setMapboxResults] = useState<MapboxFeature[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

  // Fetch existing locations (club-scoped or all clubless ones)
  const { data: locations = [], isLoading } = useQuery({
    queryKey: ["eventLocations", clubId],
    queryFn: async (): Promise<LocationRecord[]> => {
      let query = supabase
        .from("locations")
        .select("id, name, address, club_id")
        .order("name");

      if (clubId) {
        query = query.eq("club_id", clubId);
      } else {
        query = query.is("club_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Find the selected location (from fetched list or by ID)
  const selectedLocation = locations.find((l) => l.id === value);
  const [selectedName, setSelectedName] = useState<string>("");

  // If value is set but not in the current locations list, fetch it
  useEffect(() => {
    if (value && !selectedLocation) {
      supabase
        .from("locations")
        .select("name, address")
        .eq("id", value)
        .single()
        .then(({ data }) => {
          if (data) setSelectedName(data.name);
        });
    } else if (selectedLocation) {
      setSelectedName(selectedLocation.name);
    } else {
      setSelectedName("");
    }
  }, [value, selectedLocation]);

  // Filter saved locations by search
  const filteredLocations = locations.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exactMatch = filteredLocations.find(
    (l) => l.name.toLowerCase() === searchQuery.toLowerCase()
  );

  // Mapbox autocomplete
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2 || !token) {
      setMapboxResults([]);
      return;
    }

    let active = true;

    const fetchPlaces = async () => {
      const url = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          searchQuery
        )}.json`
      );
      url.searchParams.set("types", "address,poi,place");
      url.searchParams.set("language", "en");
      url.searchParams.set("limit", "5");
      url.searchParams.set("access_token", token);

      try {
        const res = await fetch(url.toString());
        if (!res.ok) return;
        const data = await res.json();
        if (active) {
          setMapboxResults(data.features ?? []);
        }
      } catch {
        // silently fail
      }
    };

    const t = setTimeout(fetchPlaces, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [searchQuery, token]);

  // Create location from Mapbox result
  const createFromMapbox = async (feature: MapboxFeature) => {
    setIsCreating(true);
    try {
      const name = feature.text ?? feature.place_name ?? searchQuery;
      const address = feature.place_name ?? null;
      const [lng, lat] = feature.center ?? [null, null];

      // Try with full columns; fallback to basic insert if columns don't exist
      let result = await supabase
        .from("locations")
        .insert({
          club_id: clubId,
          name,
          address,
          latitude: lat,
          longitude: lng,
        })
        .select("id")
        .single();

      if (result.error) {
        // Fallback: insert without new columns
        result = await supabase
          .from("locations")
          .insert({ club_id: clubId, name })
          .select("id")
          .single();
      }

      const { data, error } = result;
      if (error) throw error;

      await queryClient.invalidateQueries({
        queryKey: ["eventLocations", clubId],
      });

      onValueChange(data.id);
      setSelectedName(name);
      setSearchQuery("");
      setOpen(false);
    } catch {
      toast.error("Failed to create location.");
    } finally {
      setIsCreating(false);
    }
  };

  // Create location from free text (no Mapbox)
  const createFromText = async (name: string) => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from("locations")
        .insert({ club_id: clubId, name: name.trim() })
        .select("id")
        .single();

      if (error) throw error;

      await queryClient.invalidateQueries({
        queryKey: ["eventLocations", clubId],
      });

      onValueChange(data.id);
      setSelectedName(name.trim());
      setSearchQuery("");
      setOpen(false);
      toast.success("Location created");
    } catch {
      toast.error("Failed to create location.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectExisting = (locationId: string) => {
    onValueChange(locationId);
    setOpen(false);
    setSearchQuery("");
  };

  const displayLabel =
    value && selectedName
      ? selectedName
      : value && selectedLocation
        ? selectedLocation.name
        : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{displayLabel}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search locations..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Spinner className="h-4 w-4" />
              </div>
            ) : (
              <>
                {/* Clear selection */}
                {value && (
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        onValueChange(null);
                        setSelectedName("");
                        setSearchQuery("");
                        setOpen(false);
                      }}
                      className="cursor-pointer text-muted-foreground"
                    >
                      Clear selection
                    </CommandItem>
                  </CommandGroup>
                )}

                {/* Saved locations */}
                {filteredLocations.length > 0 && (
                  <CommandGroup heading="Saved locations">
                    {filteredLocations.map((location) => (
                      <CommandItem
                        key={location.id}
                        value={location.id}
                        onSelect={() => handleSelectExisting(location.id)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === location.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span>{location.name}</span>
                          {location.address && (
                            <span className="text-xs text-muted-foreground truncate">
                              {location.address}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Mapbox results */}
                {mapboxResults.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Search results">
                      {mapboxResults.map((feature) => (
                        <CommandItem
                          key={feature.id}
                          onSelect={() => createFromMapbox(feature)}
                          className="cursor-pointer"
                          disabled={isCreating}
                        >
                          <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span>{feature.text}</span>
                            {feature.place_name && feature.place_name !== feature.text && (
                              <span className="text-xs text-muted-foreground truncate">
                                {feature.place_name}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}

                {/* Create new from text */}
                {searchQuery.trim() && !exactMatch && mapboxResults.length === 0 && (
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => createFromText(searchQuery)}
                      className="cursor-pointer text-blue-600 dark:text-blue-400"
                      disabled={isCreating}
                    >
                      {isCreating ? (
                        <Spinner className="mr-2 h-4 w-4" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      Create "{searchQuery.trim()}"
                    </CommandItem>
                  </CommandGroup>
                )}

                {/* Empty state */}
                {filteredLocations.length === 0 &&
                  mapboxResults.length === 0 &&
                  !searchQuery.trim() && (
                    <CommandEmpty>
                      Type to search for a location
                      {token ? " or find an address" : ""}.
                    </CommandEmpty>
                  )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
