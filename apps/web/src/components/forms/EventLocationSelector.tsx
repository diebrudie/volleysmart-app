import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Search, Pencil, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
}

interface EventLocationSelectorProps {
  clubId: string | null;
  value: string | null;
  onValueChange: (locationId: string | null) => void;
  placeholder?: string;
  /** [lng, lat] to bias Mapbox address suggestions toward a location */
  proximity?: [number, number] | null;
}

export const EventLocationSelector = ({
  clubId,
  value,
  onValueChange,
  proximity,
}: EventLocationSelectorProps) => {
  const { user } = useAuth();
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(
    value
  );
  const [latLng, setLatLng] = useState<[number, number] | null>(null);
  const [originalAddress, setOriginalAddress] = useState<string | null>(null);

  const [addressEditing, setAddressEditing] = useState(false);
  const [showNameDropdown, setShowNameDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [mapboxResults, setMapboxResults] = useState<MapboxFeature[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const nameRef = useRef<HTMLDivElement>(null);
  const addressRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

  // Fetch saved locations — when a club is selected, show that club's locations.
  // When no club (personal event), show ALL locations from user's clubs + clubless ones.
  const { data: locations = [] } = useQuery({
    queryKey: ["eventLocations", clubId, user?.id],
    queryFn: async (): Promise<LocationRecord[]> => {
      if (clubId) {
        const { data, error } = await supabase
          .from("locations")
          .select("id, name, address, club_id")
          .eq("club_id", clubId)
          .order("name");
        if (error) throw error;
        return data || [];
      }

      // No club selected — fetch locations from all user's clubs + clubless
      const { data: memberships } = await supabase
        .from("club_members")
        .select("club_id")
        .eq("user_id", user!.id)
        .eq("is_active", true)
        .eq("status", "active");

      const memberClubIds = (memberships ?? [])
        .map((m) => m.club_id)
        .filter(Boolean) as string[];

      // Fetch club locations + clubless locations in parallel
      const clubLocsPromise =
        memberClubIds.length > 0
          ? supabase
              .from("locations")
              .select("id, name, address, club_id")
              .in("club_id", memberClubIds)
              .order("name")
          : Promise.resolve({ data: [] as LocationRecord[], error: null });

      const personalLocsPromise = supabase
        .from("locations")
        .select("id, name, address, club_id")
        .is("club_id", null)
        .order("name");

      const [clubResult, personalResult] = await Promise.all([
        clubLocsPromise,
        personalLocsPromise,
      ]);

      if (clubResult.error) throw clubResult.error;
      if (personalResult.error) throw personalResult.error;

      const all = [
        ...((clubResult.data ?? []) as LocationRecord[]),
        ...((personalResult.data ?? []) as LocationRecord[]),
      ];

      // Deduplicate by id and sort by name
      const seen = new Set<string>();
      return all
        .filter((l) => {
          if (seen.has(l.id)) return false;
          seen.add(l.id);
          return true;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    enabled: !!user?.id,
  });

  // Hydrate from value prop (when editing or value set externally)
  useEffect(() => {
    if (value) {
      const found = locations.find((l) => l.id === value);
      if (found) {
        setLocationName(found.name);
        setAddress(found.address ?? "");
        setOriginalAddress(found.address ?? "");
        setSelectedLocationId(found.id);
      } else {
        // Fetch if not in local list
        supabase
          .from("locations")
          .select("id, name, address")
          .eq("id", value)
          .single()
          .then(({ data }) => {
            if (data) {
              setLocationName(data.name);
              setAddress((data as any).address ?? "");
              setOriginalAddress((data as any).address ?? "");
              setSelectedLocationId(data.id);
            }
          });
      }
    } else {
      setLocationName("");
      setAddress("");
      setOriginalAddress(null);
      setSelectedLocationId(null);
      setLatLng(null);
    }
  }, [value, locations]);

  // Filter saved locations by name input
  const filteredLocations = locationName.trim()
    ? locations.filter((l) =>
        l.name.toLowerCase().includes(locationName.toLowerCase())
      )
    : locations;

  // Mapbox autocomplete for address
  useEffect(() => {
    if (!address || address.length < 2 || !token) {
      setMapboxResults([]);
      return;
    }

    // Don't search if address matches the original (user selected saved location, didn't change)
    if (address === originalAddress) {
      setMapboxResults([]);
      return;
    }

    let active = true;
    const fetchPlaces = async () => {
      const url = new URL(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          address
        )}.json`
      );
      url.searchParams.set("types", "address,poi,place");
      url.searchParams.set("language", "en");
      url.searchParams.set("limit", "5");
      if (proximity) {
        url.searchParams.set("proximity", proximity.join(","));
      }
      url.searchParams.set("access_token", token);

      try {
        const res = await fetch(url.toString());
        if (!res.ok) return;
        const data = await res.json();
        if (active) setMapboxResults(data.features ?? []);
      } catch {
        // silently fail
      }
    };

    const t = setTimeout(fetchPlaces, 300);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [address, token, originalAddress, proximity]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (nameRef.current && !nameRef.current.contains(e.target as Node)) {
        setShowNameDropdown(false);
      }
      if (
        addressRef.current &&
        !addressRef.current.contains(e.target as Node)
      ) {
        setShowAddressDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Select a saved location
  const handleSelectSaved = (loc: LocationRecord) => {
    setLocationName(loc.name);
    setAddress(loc.address ?? "");
    setOriginalAddress(loc.address ?? "");
    setSelectedLocationId(loc.id);
    setLatLng(null);
    setAddressEditing(false);
    setShowNameDropdown(false);
    onValueChange(loc.id);
  };

  // Select a Mapbox result
  const handleSelectMapbox = (feature: MapboxFeature) => {
    const fullAddress = feature.place_name ?? feature.text ?? address;
    setAddress(fullAddress);
    if (feature.center) {
      setLatLng([feature.center[0], feature.center[1]]);
    }
    setMapboxResults([]);
    setShowAddressDropdown(false);
  };

  // Save/create/update location on blur
  const commitLocation = useCallback(async () => {
    const trimmedName = locationName.trim();

    // If name is empty, clear everything
    if (!trimmedName) {
      setSelectedLocationId(null);
      setAddress("");
      setOriginalAddress(null);
      setLatLng(null);
      onValueChange(null);
      return;
    }

    // If we have a selected location and nothing changed, no-op
    if (
      selectedLocationId &&
      address === originalAddress
    ) {
      return;
    }

    setIsSaving(true);
    try {
      if (selectedLocationId && address !== originalAddress) {
        // Update existing location's address
        const updatePayload: Record<string, any> = {
          address: address.trim() || null,
        };
        if (latLng) {
          updatePayload.latitude = latLng[1];
          updatePayload.longitude = latLng[0];
        }

        const { error } = await supabase
          .from("locations")
          .update(updatePayload)
          .eq("id", selectedLocationId);

        if (error) throw error;

        setOriginalAddress(address.trim() || null);
        await queryClient.invalidateQueries({
          queryKey: ["eventLocations", clubId],
        });
        onValueChange(selectedLocationId);
      } else if (!selectedLocationId) {
        // Create new location — address is required
        if (!address.trim()) {
          toast.error("Please add an address for the new location.");
          return;
        }
        const insertPayload: Record<string, any> = {
          club_id: clubId,
          name: trimmedName,
          address: address.trim(),
        };
        if (latLng) {
          insertPayload.latitude = latLng[1];
          insertPayload.longitude = latLng[0];
        }

        let result = await supabase
          .from("locations")
          .insert(insertPayload)
          .select("id")
          .single();

        // Fallback if lat/lng columns don't exist
        if (result.error && latLng) {
          result = await supabase
            .from("locations")
            .insert({
              club_id: clubId,
              name: trimmedName,
              address: address.trim() || null,
            })
            .select("id")
            .single();
        }

        if (result.error) throw result.error;

        setSelectedLocationId(result.data.id);
        setOriginalAddress(address.trim() || null);
        await queryClient.invalidateQueries({
          queryKey: ["eventLocations", clubId],
        });
        onValueChange(result.data.id);
        toast.success("Location saved");
      }
    } catch {
      toast.error("Failed to save location.");
    } finally {
      setIsSaving(false);
    }
  }, [
    locationName,
    address,
    selectedLocationId,
    originalAddress,
    latLng,
    clubId,
    onValueChange,
    queryClient,
  ]);

  // When name changes and doesn't match selected location, deselect
  const handleNameChange = (val: string) => {
    setLocationName(val);
    if (
      selectedLocationId &&
      val !== locations.find((l) => l.id === selectedLocationId)?.name
    ) {
      setSelectedLocationId(null);
      setAddressEditing(false);
      onValueChange(null);
    }
    setShowNameDropdown(true);
  };

  const clearLocation = () => {
    setLocationName("");
    setAddress("");
    setOriginalAddress(null);
    setSelectedLocationId(null);
    setLatLng(null);
    setAddressEditing(false);
    onValueChange(null);
  };

  const handleAddressChange = (val: string) => {
    setAddress(val);
    setShowAddressDropdown(true);
    // Clear latLng when user edits address manually
    setLatLng(null);
  };

  return (
    <div className="space-y-3">
      {/* Location Name */}
      <div className="space-y-1.5" ref={nameRef}>
        <Label className="text-sm">Location Name *</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="e.g. Berlin Sports Hall"
            value={locationName}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => setShowNameDropdown(true)}
            onBlur={() => {
              setTimeout(() => {
                setShowNameDropdown(false);
                commitLocation();
              }, 200);
            }}
            readOnly={!!selectedLocationId}
            className={cn(
              "pl-10",
              selectedLocationId && "pr-10 bg-muted cursor-default"
            )}
          />
          {/* Clear button when a saved location is selected */}
          {selectedLocationId && (
            <button
              type="button"
              onClick={clearLocation}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-accent"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
          {/* Saved locations dropdown */}
          {showNameDropdown && !selectedLocationId && filteredLocations.length > 0 && (
            <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
              {filteredLocations.map((loc) => (
                <button
                  key={loc.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectSaved(loc)}
                  className={cn(
                    "w-full text-left px-3 py-2 hover:bg-accent flex flex-col gap-0.5",
                    selectedLocationId === loc.id && "bg-accent"
                  )}
                >
                  <span className="text-sm font-medium">{loc.name}</span>
                  {loc.address && (
                    <span className="text-xs text-muted-foreground truncate">
                      {loc.address}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Address */}
      <div className="space-y-1.5" ref={addressRef}>
        <Label className="text-sm">
          Address {!selectedLocationId && locationName.trim() && "*"}
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          {(() => {
            // Address is disabled when: no name entered, OR saved location selected and not editing
            const hasName = !!locationName.trim();
            const isLocked = !!selectedLocationId && !addressEditing;
            const isDisabled = !hasName || isLocked;
            return (
              <>
                <Input
                  placeholder="Search for an address..."
                  value={address}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  onFocus={() => {
                    if (mapboxResults.length > 0) setShowAddressDropdown(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setShowAddressDropdown(false);
                      commitLocation();
                    }, 200);
                  }}
                  disabled={isDisabled}
                  className={cn(
                    "pl-10",
                    isDisabled && "bg-muted cursor-default",
                    isLocked && "pr-10"
                  )}
                />
                {/* Pencil icon to enable editing on locked address */}
                {isLocked && (
                  <button
                    type="button"
                    onClick={() => setAddressEditing(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-accent"
                  >
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </>
            );
          })()}
          {/* Mapbox results dropdown */}
          {showAddressDropdown && mapboxResults.length > 0 && (
            <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
              {mapboxResults.map((feature) => (
                <button
                  key={feature.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelectMapbox(feature)}
                  className="w-full text-left px-3 py-2 hover:bg-accent flex flex-col gap-0.5"
                >
                  <span className="text-sm font-medium">
                    {feature.text}
                  </span>
                  {feature.place_name &&
                    feature.place_name !== feature.text && (
                      <span className="text-xs text-muted-foreground truncate">
                        {feature.place_name}
                      </span>
                    )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isSaving && (
        <p className="text-xs text-muted-foreground">Saving location...</p>
      )}
    </div>
  );
};
