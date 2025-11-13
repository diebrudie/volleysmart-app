import { useState, useEffect } from "react";
import { Check, ChevronDown, Plus, MapPin } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
  club_id: string;
}

interface LocationSelectorProps {
  clubId: string;
  value?: string;
  onValueChange: (locationId: string | undefined) => void;
  placeholder?: string;
  className?: string;
}

export const LocationSelector = ({
  clubId,
  value,
  onValueChange,
  placeholder = "Select location...",
  className,
}: LocationSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const queryClient = useQueryClient();

  // Fetch locations for the club
  const {
    data: locations = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["clubLocations", clubId],
    queryFn: async (): Promise<Location[]> => {
      if (!clubId) return [];

      const { data, error } = await supabase
        .from("locations")
        .select("id, name, club_id")
        .eq("club_id", clubId)
        .order("name");

      if (error) {
        console.error("Error fetching locations:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!clubId,
  });

  // Find selected location
  const selectedLocation = locations.find((location) => location.id === value);

  // Filter locations based on search
  const filteredLocations = locations.filter((location) =>
    location.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if search query matches any existing location exactly
  const exactMatch = filteredLocations.find(
    (location) => location.name.toLowerCase() === searchQuery.toLowerCase()
  );

  // Create new location
  const createLocation = async (name: string) => {
    if (!name.trim()) return;

    setIsCreatingLocation(true);

    try {
      const { data, error } = await supabase
        .from("locations")
        .insert({
          club_id: clubId,
          name: name.trim(),
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating location:", error);
        throw error;
      }

      // Invalidate and refetch locations
      await queryClient.invalidateQueries({
        queryKey: ["clubLocations", clubId],
      });

      // Select the newly created location
      onValueChange(data.id);
      setSearchQuery("");
      setOpen(false);

      toast.success("Location created successfully");
    } catch (error) {
      console.error("Failed to create location:", error);
      toast.error("Failed to create location. Please try again.");
    } finally {
      setIsCreatingLocation(false);
    }
  };

  // Handle location selection
  const handleSelect = (locationId: string) => {
    onValueChange(locationId);
    setOpen(false);
    setSearchQuery("");
  };

  // Handle create new location
  const handleCreateNew = () => {
    if (searchQuery.trim()) {
      createLocation(searchQuery.trim());
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between border-gray-300 dark:border-gray-600",
            !value && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-400" />
            {selectedLocation ? selectedLocation.name : placeholder}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
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
                {filteredLocations.length > 0 ? (
                  <CommandGroup>
                    {filteredLocations.map((location) => (
                      <CommandItem
                        key={location.id}
                        value={location.id}
                        onSelect={() => handleSelect(location.id)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === location.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <MapPin className="mr-2 h-4 w-4 text-gray-400" />
                        {location.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : (
                  <CommandEmpty>
                    {searchQuery ? "No locations found." : "No locations yet."}
                  </CommandEmpty>
                )}

                {/* Show "Create new" option when there's a search query and no exact match */}
                {searchQuery.trim() && !exactMatch && (
                  <CommandGroup>
                    <CommandItem
                      onSelect={handleCreateNew}
                      className="cursor-pointer text-blue-600 dark:text-blue-400"
                      disabled={isCreatingLocation}
                    >
                      {isCreatingLocation ? (
                        <Spinner className="mr-2 h-4 w-4" />
                      ) : (
                        <Plus className="mr-2 h-4 w-4" />
                      )}
                      Create "{searchQuery.trim()}"
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
