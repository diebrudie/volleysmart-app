import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileInput } from "@/components/ui/file-input";
import CopyableClubId from "@/components/clubs/CopyableClubId";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import CityLocationSelector, {
  LocationValue,
} from "@/components/forms/CityLocationSelector";
import { Switch } from "@/components/ui/switch";
import { HelpCircle, Upload } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ClubSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  club: {
    id: string;
    name: string;
    image_url: string | null;
    slug: string; // 5-char Club ID
    city?: string | null;
    country?: string | null;
    country_code?: string | null;
    is_club_discoverable?: boolean;
  };
}

// Used to compute hasChanges reliably even after a refresh.
type InitialSnapshot = {
  name: string;
  image_url: string | null;
  city: string;
  country: string;
  country_code: string;
  is_club_discoverable: boolean;
  modified_at?: string | null;
};

type ClubRow = {
  name: string;
  image_url: string | null;
  slug: string;
  city: string | null;
  country: string | null;
  country_code: string | null;
  is_club_discoverable: boolean | null;
  modified_at: string | null;
};

const ClubSettingsDialog = ({
  isOpen,
  onClose,
  club,
}: ClubSettingsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState(club.name);
  const [imageFile, setImageFile] = useState<File | null>(null); // new upload
  const [imagePreview, setImagePreview] = useState<string | null>(
    club.image_url ?? null
  ); // show existing or selected
  const [existingImageRemoved, setExistingImageRemoved] = useState(false); // mark DB image for deletion
  const [fileName, setFileName] = useState<string | null>(null); // newly picked file name
  const [fileInputKey, setFileInputKey] = useState<number>(0); // reset input
  const [isLoading, setIsLoading] = useState(false);

  // Location + discoverability state
  const [location, setLocation] = useState<LocationValue | null>(() => {
    if (club.city && club.country && club.country_code) {
      return {
        city: club.city,
        country: club.country,
        countryCode: (club.country_code || "").toUpperCase(),
      };
    }
    return null;
  });
  const [manualCity, setManualCity] = useState<string>(club.city ?? "");
  const [manualCountry, setManualCountry] = useState<string>(
    club.country ?? ""
  );
  const [manualCountryCode, setManualCountryCode] = useState<string>(
    (club.country_code ?? "").toUpperCase()
  );
  const [isDiscoverable, setIsDiscoverable] = useState<boolean>(
    !!club.is_club_discoverable
  );

  // Baseline snapshot of fields as loaded from DB when dialog opens.
  const [initial, setInitial] = useState<InitialSnapshot>({
    name: club.name,
    image_url: club.image_url ?? null,
    city: club.city ?? "",
    country: club.country ?? "",
    country_code: (club.country_code ?? "").toUpperCase(),
    is_club_discoverable: !!club.is_club_discoverable,
    // modified_at is optional in props; will be set after fetch
    modified_at: undefined,
  });

  const [loadingClub, setLoadingClub] = useState<boolean>(false);

  const [showManual, setShowManual] = useState(false);
  const hasMapbox = Boolean(
    import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
  );
  useEffect(() => {
    if (!hasMapbox) setShowManual(true);
  }, [hasMapbox]);

  // Reset form when dialog opens with new club data

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isOpen || !club?.id) return;

      setLoadingClub(true);
      try {
        const { data, error } = await supabase
          .from("clubs")
          .select(
            "name, image_url, slug, city, country, country_code, is_club_discoverable, modified_at"
          )
          .eq("id", club.id)
          .single();

        const effective: ClubRow =
          !error && data
            ? (data as ClubRow)
            : {
                name: club.name,
                image_url: club.image_url ?? null,
                slug: club.slug,
                city: club.city ?? null,
                country: club.country ?? null,
                country_code: club.country_code ?? null,
                is_club_discoverable: club.is_club_discoverable ?? false,
                modified_at: null,
              };

        if (cancelled) return;

        // Reset UI state from fresh data
        setName(effective.name);
        setImageFile(null);
        setFileName(null);
        setExistingImageRemoved(false);
        setImagePreview(effective.image_url ?? null);
        setFileInputKey((k) => k + 1);

        const hasLoc = Boolean(
          effective.city && effective.country && effective.country_code
        );
        setLocation(
          hasLoc
            ? {
                city: effective.city as string,
                country: effective.country as string,
                countryCode: String(effective.country_code).toUpperCase(),
              }
            : null
        );
        setManualCity(effective.city ?? "");
        setManualCountry(effective.country ?? "");
        setManualCountryCode(
          String(effective.country_code ?? "").toUpperCase()
        );
        setIsDiscoverable(Boolean(effective.is_club_discoverable));
        setShowManual(!hasMapbox && !hasLoc); // manual if no token & no existing loc

        setInitial({
          name: effective.name,
          image_url: effective.image_url ?? null,
          city: effective.city ?? "",
          country: effective.country ?? "",
          country_code: String(effective.country_code ?? "").toUpperCase(),
          is_club_discoverable: Boolean(effective.is_club_discoverable),
          modified_at: effective.modified_at,
        });
      } finally {
        if (!cancelled) setLoadingClub(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, club?.id, hasMapbox]);

  /**
   * Selecting a new file replaces any existing preview and cancels "removed" state.
   */
  const handleImageChange = (file: File) => {
    setImageFile(file);
    setFileName(file?.name ?? null);
    setExistingImageRemoved(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Remove the currently *stored* image (when editing).
   * Sets preview to null and marks for DB update (image_url -> null).
   */
  const handleRemoveExistingImage = () => {
    setExistingImageRemoved(true);
    setImageFile(null);
    setFileName(null);
    setImagePreview(null);
    setFileInputKey((k) => k + 1);
  };

  /**
   * Clear a *newly selected* file before saving.
   */
  const handleClearSelectedImage = () => {
    setImageFile(null);
    setFileName(null);
    // If the club had an existing image and we did not mark it removed, restore its preview
    setImagePreview(existingImageRemoved ? null : club.image_url ?? null);
    setFileInputKey((k) => k + 1);
  };

  // Check if there are any changes
  const hasChanges =
    name.trim() !== initial.name ||
    imageFile !== null ||
    existingImageRemoved === true ||
    (location?.city ?? manualCity) !== initial.city ||
    (location?.country ?? manualCountry) !== initial.country ||
    (location?.countryCode ?? manualCountryCode.toUpperCase()) !==
      initial.country_code ||
    isDiscoverable !== initial.is_club_discoverable;

  const handleSave = async () => {
    if (!user?.id) return;

    // Small helpers to normalize payload
    const norm = (s: string | null | undefined): string | null => {
      const v = (s ?? "").trim();
      return v.length ? v : null;
    };
    const normIso2 = (s: string | null | undefined): string | null => {
      const v = (s ?? "").trim().toUpperCase();
      return v.length ? v : null;
    };

    setIsLoading(true);
    try {
      let imageUrl: string | null = club.image_url;

      // If user explicitly removed existing image and did not pick a new one
      if (existingImageRemoved && !imageFile) {
        imageUrl = null;
      }

      // Upload a *new* image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const storageName = `${club.id}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("club-images")
          .upload(storageName, imageFile);

        if (uploadError) {
          if (
            uploadError.message?.includes("bucket") ||
            uploadError.message?.includes("policy")
          ) {
            console.warn("Storage policy warning:", uploadError.message);
            // allow continue with previous imageUrl/null
          } else {
            throw uploadError;
          }
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from("club-images").getPublicUrl(storageName);
          imageUrl = publicUrl;
        }
      }

      // Build normalized payload for all edited fields
      const payload = {
        name: name.trim(),
        image_url: imageUrl,
        city: norm(location?.city ?? manualCity),
        country: norm(location?.country ?? manualCountry),
        country_code: normIso2(location?.countryCode ?? manualCountryCode),
        is_club_discoverable: isDiscoverable,
      };

      // Persist and force return of updated row
      const { data: updated, error: updateError } = await supabase
        .from("clubs")
        .update(payload)
        .eq("id", club.id)
        .select(
          "id, name, image_url, city, country, country_code, is_club_discoverable, modified_at"
        )
        .maybeSingle();

      if (updateError) throw updateError;
      if (!updated) {
        console.warn(
          "[ClubSettingsDialog] No row updated. Check RLS or id filter.",
          {
            clubId: club.id,
          }
        );
        toast({
          title: "Not saved",
          description: "No changes were persisted. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Rehydrate local snapshot/UI from DB truth
      setInitial({
        name: updated.name,
        image_url: updated.image_url ?? null,
        city: updated.city ?? "",
        country: updated.country ?? "",
        country_code: String(updated.country_code ?? "").toUpperCase(),
        is_club_discoverable: Boolean(updated.is_club_discoverable),
        modified_at: updated.modified_at ?? null,
      });

      setName(updated.name);
      setImagePreview(updated.image_url ?? null);

      const hasLoc = Boolean(
        updated.city && updated.country && updated.country_code
      );
      setLocation(
        hasLoc
          ? {
              city: updated.city as string,
              country: updated.country as string,
              countryCode: String(updated.country_code).toUpperCase(),
            }
          : null
      );
      setManualCity(updated.city ?? "");
      setManualCountry(updated.country ?? "");
      setManualCountryCode(String(updated.country_code ?? "").toUpperCase());

      toast({
        title: "Success",
        description: "Club updated successfully",
        duration: 2000,
      });

      // keep caches in sync
      queryClient.invalidateQueries({ queryKey: ["userClubs"] });

      onClose();
    } catch (error) {
      console.error("Error updating club:", error);
      toast({
        title: "Error",
        description: "Failed to update club",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader className="mb-4 mt-5 text-left">
          <div className="flex items-end justify-between gap-4">
            {/* Left: title + subtitle */}
            <div className="space-y-1">
              <DialogTitle>Club Settings</DialogTitle>
              <DialogDescription>Edit your club details.</DialogDescription>
            </div>

            {/* Club ID (slug) display - full width, copyable */}
            {club.slug && (
              <div className="shrink-0">
                <CopyableClubId slug={club.slug} compact />
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="club-name">Club Name</Label>
            <Input
              id="club-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter club name"
            />
          </div>

          {/* Club Image */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="club-image">Club Image</Label>

            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              {/* Left: circular preview (Avatar) with overlay X when an image exists */}
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={imagePreview || ""}
                    alt="Club preview"
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-gray-200 dark:bg-gray-700">
                    📷
                  </AvatarFallback>
                </Avatar>

                {/* Show overlay X only when there is an image preview (existing or newly chosen) */}
                {imagePreview && (
                  <button
                    type="button"
                    onClick={
                      imageFile
                        ? handleClearSelectedImage
                        : handleRemoveExistingImage
                    }
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 text-red-600 hover:text-red-700 text-sm leading-none"
                    aria-label="Remove image"
                    title="Remove image"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Right: dashed upload button and filename line */}
              <div className="flex-1">
                <label
                  htmlFor="club-image-upload"
                  className="cursor-pointer inline-block"
                >
                  <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors bg-white dark:bg-gray-800 w-fit">
                    <Upload className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {imagePreview ? "Change Photo" : "Upload Photo"}
                    </span>
                  </div>
                </label>
                <input
                  id="club-image-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageChange(file);
                  }}
                />

                {/* Green filename only for a newly chosen file; red × clears selection */}
                {fileName && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-green-600 dark:text-green-400">
                      ✓ {fileName}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearSelectedImage}
                      className="text-red-600 hover:text-red-700 text-sm"
                      aria-label="Remove selected image"
                      title="Remove selected image"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* City (autocomplete with Mapbox) */}
          <div className="space-y-3">
            <CityLocationSelector
              value={location}
              onChange={(val) => {
                setLocation(val);
                if (val) {
                  setManualCity(val.city);
                  setManualCountry(val.country);
                  setManualCountryCode(val.countryCode.toUpperCase());
                  // optional: hide manual if we got a proper selection
                  setShowManual(false);
                }
              }}
              onTextChange={(text) => {
                // user is free-typing, reflect into manual fields so save persists it
                setLocation(null);
                setManualCity(text);
                setManualCountry("");
                setManualCountryCode("");
              }}
              label="City"
              labelExtra={
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-foreground"
                      aria-label="City selection help"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="text-sm max-w-xs">
                    Please make sure you select a City from the dropdown.
                  </PopoverContent>
                </Popover>
              }
              placeholder="Type the city your Club is located…"
            />

            {/* Manual entry toggle & note */}
            {!location && (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-xs underline text-muted-foreground hover:text-foreground"
                  onClick={() => setShowManual((v) => !v)}
                >
                  {showManual
                    ? "Hide manual entry"
                    : "Can't find your city? Enter manually"}
                </button>
                {!hasMapbox && (
                  <span className="text-xs text-muted-foreground">
                    Mapbox disabled—use manual entry.
                  </span>
                )}
              </div>
            )}

            {/* Manual fields (hidden by default unless toggled) */}
            {showManual && !location && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>City</Label>
                  <Input
                    placeholder="e.g., Berlin"
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input
                    placeholder="e.g., Germany"
                    value={manualCountry}
                    onChange={(e) => setManualCountry(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Country code</Label>
                  <Input
                    placeholder="e.g., DE"
                    value={manualCountryCode}
                    onChange={(e) =>
                      setManualCountryCode(e.target.value.toUpperCase())
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* Discoverability toggle */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="is_club_discoverable" className="m-0">
                Make this club discoverable
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-foreground"
                    aria-label="Discoverable help"
                  >
                    <HelpCircle className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="text-sm max-w-xs">
                  If enabled, others can find this club on the Discovery page.
                  Coming soon!
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="is_club_discoverable"
                checked={isDiscoverable}
                onCheckedChange={setIsDiscoverable}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 mt-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !name.trim() || !hasChanges}
            className="flex-1"
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClubSettingsDialog;
