import { useState, useEffect } from "react";
import { useIsCompact } from "@/hooks/use-compact";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    slug: string;
    description?: string | null;
    city?: string | null;
    country?: string | null;
    country_code?: string | null;
    is_club_discoverable?: boolean;
  };
}

type InitialSnapshot = {
  name: string;
  description: string;
  image_url: string | null;
  city: string;
  country: string;
  country_code: string;
  is_club_discoverable: boolean;
  modified_at?: string | null;
};

type ClubRow = {
  name: string;
  description: string | null;
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
  const isCompact = useIsCompact();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState(club.name);
  const [description, setDescription] = useState(club.description ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    club.image_url ?? null
  );
  const [existingImageRemoved, setExistingImageRemoved] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

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

  const [initial, setInitial] = useState<InitialSnapshot>({
    name: club.name,
    description: club.description ?? "",
    image_url: club.image_url ?? null,
    city: club.city ?? "",
    country: club.country ?? "",
    country_code: (club.country_code ?? "").toUpperCase(),
    is_club_discoverable: !!club.is_club_discoverable,
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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!isOpen || !club?.id) return;

      setLoadingClub(true);
      try {
        const { data, error } = await supabase
          .from("clubs")
          .select(
            "name, description, image_url, slug, city, country, country_code, is_club_discoverable, modified_at"
          )
          .eq("id", club.id)
          .single();

        const effective: ClubRow =
          !error && data
            ? (data as ClubRow)
            : {
                name: club.name,
                description: club.description ?? null,
                image_url: club.image_url ?? null,
                slug: club.slug,
                city: club.city ?? null,
                country: club.country ?? null,
                country_code: club.country_code ?? null,
                is_club_discoverable: club.is_club_discoverable ?? false,
                modified_at: null,
              };

        if (cancelled) return;

        setName(effective.name);
        setDescription(effective.description ?? "");
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
        setShowManual(!hasMapbox && !hasLoc);

        setInitial({
          name: effective.name,
          description: effective.description ?? "",
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

  const handleRemoveExistingImage = () => {
    setExistingImageRemoved(true);
    setImageFile(null);
    setFileName(null);
    setImagePreview(null);
    setFileInputKey((k) => k + 1);
  };

  const handleClearSelectedImage = () => {
    setImageFile(null);
    setFileName(null);
    setImagePreview(existingImageRemoved ? null : club.image_url ?? null);
    setFileInputKey((k) => k + 1);
  };

  const hasChanges =
    name.trim() !== initial.name ||
    description.trim() !== initial.description ||
    imageFile !== null ||
    existingImageRemoved === true ||
    (location?.city ?? manualCity) !== initial.city ||
    (location?.country ?? manualCountry) !== initial.country ||
    (location?.countryCode ?? manualCountryCode.toUpperCase()) !==
      initial.country_code ||
    isDiscoverable !== initial.is_club_discoverable;

  const handleSave = async () => {
    if (!user?.id) return;

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

      if (existingImageRemoved && !imageFile) {
        imageUrl = null;
      }

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

      const payload = {
        name: name.trim(),
        description: norm(description),
        image_url: imageUrl,
        city: norm(location?.city ?? manualCity),
        country: norm(location?.country ?? manualCountry),
        country_code: normIso2(location?.countryCode ?? manualCountryCode),
        is_club_discoverable: isDiscoverable,
      };

      const { data: updated, error: updateError } = await supabase
        .from("clubs")
        .update(payload)
        .eq("id", club.id)
        .select(
          "id, name, description, image_url, city, country, country_code, is_club_discoverable, modified_at"
        )
        .maybeSingle();

      if (updateError) throw updateError;
      if (!updated) {
        toast({
          title: "Not saved",
          description: "No changes were persisted. Please try again.",
          variant: "destructive",
          duration: 2000,
        });
        setIsLoading(false);
        return;
      }

      setInitial({
        name: updated.name,
        description: updated.description ?? "",
        image_url: updated.image_url ?? null,
        city: updated.city ?? "",
        country: updated.country ?? "",
        country_code: String(updated.country_code ?? "").toUpperCase(),
        is_club_discoverable: Boolean(updated.is_club_discoverable),
        modified_at: updated.modified_at ?? null,
      });

      setName(updated.name);
      setDescription(updated.description ?? "");
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

      queryClient.invalidateQueries({ queryKey: ["userClubs"] });
      queryClient.invalidateQueries({ queryKey: ["club-detail", club.id] });

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
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side={isCompact ? "bottom" : "right"} className={`max-h-[90vh] flex flex-col p-0 ${isCompact ? "rounded-t-2xl" : ""}`}>
        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <SheetTitle>Club Settings</SheetTitle>
        </SheetHeader>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-5">
          {/* Club Name */}
          <div className="space-y-1.5">
            <Label htmlFor="club-name">Club Name</Label>
            <Input
              id="club-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter club name"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="club-description">
              Description / Notes (optional)
            </Label>
            <div className="relative">
              <Textarea
                id="club-description"
                value={description}
                onChange={(e) => {
                  if (e.target.value.length <= 200) setDescription(e.target.value);
                }}
                placeholder="Tell people about your club…"
                rows={3}
              />
              <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
                {description.length}/200
              </span>
            </div>
          </div>

          {/* Club Image */}
          <div className="space-y-1.5">
            <Label htmlFor="club-image">Club Image</Label>

            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={imagePreview || ""}
                    alt="Club preview"
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-muted" />
                </Avatar>

                {imagePreview && (
                  <button
                    type="button"
                    onClick={
                      imageFile
                        ? handleClearSelectedImage
                        : handleRemoveExistingImage
                    }
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-background border border-border text-destructive hover:text-destructive/80 text-xs leading-none flex items-center justify-center"
                    aria-label="Remove image"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="flex-1">
                <label
                  htmlFor="club-image-upload"
                  className="cursor-pointer inline-block"
                >
                  <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-muted-foreground/30 rounded-lg hover:border-muted-foreground/50 transition-colors w-fit">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
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

                {fileName && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-xs text-green-600 dark:text-green-400">
                      {fileName}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearSelectedImage}
                      className="text-destructive hover:text-destructive/80 text-xs"
                      aria-label="Remove selected image"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* City */}
          <div className="space-y-1.5">
            <CityLocationSelector
              value={location}
              onChange={(val) => {
                setLocation(val);
                if (val) {
                  setManualCity(val.city);
                  setManualCountry(val.country);
                  setManualCountryCode(val.countryCode.toUpperCase());
                  setShowManual(false);
                }
              }}
              onTextChange={(text) => {
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
                    Mapbox disabled — use manual entry.
                  </span>
                )}
              </div>
            )}

            {showManual && !location && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input
                    placeholder="e.g., Berlin"
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Country</Label>
                  <Input
                    placeholder="e.g., Germany"
                    value={manualCountry}
                    onChange={(e) => setManualCountry(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
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
          <div className="space-y-1.5">
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

          {/* Club ID */}
          {club.slug && (
            <div className="flex justify-end">
              <CopyableClubId slug={club.slug} compact />
            </div>
          )}
        </div>

        {/* Fixed bottom buttons — matches Edit Event */}
        <div className="px-4 py-3 border-t pb-[max(env(safe-area-inset-bottom),12px)]">
          <div className="flex gap-2">
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ClubSettingsDialog;
