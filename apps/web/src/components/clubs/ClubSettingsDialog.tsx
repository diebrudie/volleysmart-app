import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
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

import CityLocationSelector, {
  LocationValue,
} from "@/components/forms/CityLocationSelector";
import { Switch } from "@/components/ui/switch";
import { HelpCircle, Upload, Check, RefreshCw } from "lucide-react";
import { getPublicUrl } from "@/integrations/supabase/storage";
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
  const { t } = useTranslation("clubs");
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

  const [selectedDefaultUrl, setSelectedDefaultUrl] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const INDOOR_IMAGES = Array.from({ length: 10 }, (_, i) =>
    `defaults/img-volleyball-indoor-${String(i + 1).padStart(2, "0")}.jpg`
  );
  const BEACH_IMAGES = Array.from({ length: 10 }, (_, i) =>
    `defaults/img-volleyball-beach-${String(i + 1).padStart(2, "0")}.jpg`
  );

  const defaultImages = useMemo(() => {
    const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
    const indoor = shuffle(INDOOR_IMAGES).slice(0, 3);
    const beach = shuffle(BEACH_IMAGES).slice(0, 2);
    return shuffle([...indoor, ...beach]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const getDefaultPublicUrl = (path: string) =>
    getPublicUrl("club-images", path);

  const handleSelectDefault = (path: string) => {
    const url = getDefaultPublicUrl(path);
    if (selectedDefaultUrl === url) {
      setSelectedDefaultUrl(null);
    } else {
      setSelectedDefaultUrl(url);
      setImageFile(null);
      setImagePreview(url);
      setFileName(null);
      setExistingImageRemoved(false);
      setFileInputKey((k) => k + 1);
    }
  };

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
        setSelectedDefaultUrl(null);
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
    setSelectedDefaultUrl(null);

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
    setSelectedDefaultUrl(null);
    setFileInputKey((k) => k + 1);
  };

  const handleClearSelectedImage = () => {
    setImageFile(null);
    setFileName(null);
    setSelectedDefaultUrl(null);
    setImagePreview(existingImageRemoved ? null : club.image_url ?? null);
    setFileInputKey((k) => k + 1);
  };

  const hasChanges =
    name.trim() !== initial.name ||
    description.trim() !== initial.description ||
    imageFile !== null ||
    existingImageRemoved === true ||
    (selectedDefaultUrl !== null && selectedDefaultUrl !== initial.image_url) ||
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

      if (selectedDefaultUrl && !imageFile) {
        imageUrl = selectedDefaultUrl;
      } else if (existingImageRemoved && !imageFile) {
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
          title: t("settings.toastNotSaved"),
          description: t("settings.toastNotSavedDescription"),
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
        title: t("settings.toastSuccess"),
        description: t("settings.toastSuccessDescription"),
        duration: 2000,
      });

      queryClient.invalidateQueries({ queryKey: ["userClubs"] });
      queryClient.invalidateQueries({ queryKey: ["club-detail", club.id] });

      onClose();
    } catch (error) {
      console.error("Error updating club:", error);
      toast({
        title: t("settings.toastError"),
        description: t("settings.toastErrorDescription"),
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
          <SheetTitle>{t("settings.title")}</SheetTitle>
        </SheetHeader>

        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-8 space-y-5">
          {/* Club Name */}
          <div className="space-y-1.5">
            <Label htmlFor="club-name">{t("settings.clubName")}</Label>
            <Input
              id="club-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("settings.clubNamePlaceholder")}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="club-description">
              {t("settings.description")}
            </Label>
            <div className="relative">
              <Textarea
                id="club-description"
                value={description}
                onChange={(e) => {
                  if (e.target.value.length <= 200) setDescription(e.target.value);
                }}
                placeholder={t("settings.descriptionPlaceholder")}
                rows={3}
              />
              <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
                {description.length}/200
              </span>
            </div>
          </div>

          {/* Club Image */}
          <div className="space-y-3">
            <Label>{t("settings.clubImage")}</Label>

            {/* Default image grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">
                  {t("settings.pickDefault")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setRefreshKey((k) => k + 1);
                    setSelectedDefaultUrl(null);
                  }}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Shuffle images"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {defaultImages.map((path) => {
                  const url = getDefaultPublicUrl(path);
                  const isSelected = selectedDefaultUrl === url && !imageFile;
                  return (
                    <button
                      key={path}
                      type="button"
                      onClick={() => handleSelectDefault(path)}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border hover:border-muted-foreground"
                      }`}
                    >
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3.5 w-3.5 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs text-muted-foreground">{t("settings.orUpload")}</span>
              <div className="flex-1 border-t border-border" />
            </div>

            {/* Custom upload */}
            <div>
              <label
                htmlFor="club-image-upload-settings"
                className="cursor-pointer inline-block"
              >
                <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-border rounded-lg hover:border-muted-foreground transition-colors bg-muted/30 w-fit">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {imagePreview && !selectedDefaultUrl ? t("settings.changePhoto") : t("settings.uploadPhoto")}
                  </span>
                </div>
              </label>
              <input
                key={fileInputKey}
                id="club-image-upload-settings"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageChange(file);
                }}
              />

              {imagePreview && !selectedDefaultUrl && (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Upload preview"
                    className="h-14 w-14 rounded-lg object-cover border border-border"
                  />
                  <div className="flex flex-col">
                    {fileName && (
                      <span className="text-sm text-green-600 dark:text-green-400 truncate max-w-[200px]">
                        {fileName}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={imageFile ? handleClearSelectedImage : handleRemoveExistingImage}
                      className="text-red-500 hover:text-red-600 text-xs font-medium text-left"
                      aria-label="Remove image"
                    >
                      {t("newClub.removeImage")}
                    </button>
                  </div>
                </div>
              )}
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
              label={t("settings.manualCity")}
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
                    {t("settings.cityHelp")}
                  </PopoverContent>
                </Popover>
              }
              placeholder={t("settings.cityPlaceholder")}
            />

            {!location && (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  className="text-xs underline text-muted-foreground hover:text-foreground"
                  onClick={() => setShowManual((v) => !v)}
                >
                  {showManual
                    ? t("settings.hideManual")
                    : t("settings.cantFindCity")}
                </button>
                {!hasMapbox && (
                  <span className="text-xs text-muted-foreground">
                    {t("settings.mapboxDisabled")}
                  </span>
                )}
              </div>
            )}

            {showManual && !location && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("settings.manualCity")}</Label>
                  <Input
                    placeholder={t("settings.manualCityPlaceholder")}
                    value={manualCity}
                    onChange={(e) => setManualCity(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("settings.manualCountry")}</Label>
                  <Input
                    placeholder={t("settings.manualCountryPlaceholder")}
                    value={manualCountry}
                    onChange={(e) => setManualCountry(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("settings.manualCountryCode")}</Label>
                  <Input
                    placeholder={t("settings.manualCountryCodePlaceholder")}
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
                {t("settings.discoverableLabel")}
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
                  {t("settings.discoverableHelp")}
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

        {/* Fixed bottom buttons — matches Edit Event */}
        <div className="px-4 py-3 border-t pb-[max(env(safe-area-inset-bottom),12px)]">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {t("settings.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !name.trim() || !hasChanges}
              className="flex-1"
            >
              {isLoading ? t("settings.saving") : t("settings.saveChanges")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ClubSettingsDialog;
