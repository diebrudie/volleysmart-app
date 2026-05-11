import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, ArrowLeft, HelpCircle, Check, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/spinner";
import { ensurePositionsExist } from "@/integrations/supabase/positions";
import { getPublicUrl } from "@/integrations/supabase/storage";
import { addClubAdmin } from "@/integrations/supabase/club";
import { useClub } from "@/contexts/ClubContext";
import CityLocationSelector, {
  LocationValue,
} from "@/components/forms/CityLocationSelector";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface NewClubFormData {
  name: string;
  description?: string;
  is_club_discoverable: boolean;
}

const NewClub = () => {
  const { t } = useTranslation("clubs");
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<NewClubFormData>({
    defaultValues: {
      is_club_discoverable: false,
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [location, setLocation] = useState<LocationValue | null>(null);
  const [selectedDefaultUrl, setSelectedDefaultUrl] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { setClubId } = useClub();

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
      setImagePreview(null);
      setFileName(null);
      setFileInputKey((k) => k + 1);
    }
  };

  const generateClubIdentifier = () => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 5; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return result;
  };

  const handleImageChange = (file: File) => {
    setImageFile(file);
    setFileName(file?.name ?? null);
    setUploadError(null);
    setSelectedDefaultUrl(null);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleClearSelectedImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFileName(null);
    setSelectedDefaultUrl(null);
    setFileInputKey((k) => k + 1);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop();
      const fName = `${Date.now()}.${fileExt}`;
      const filePath = `clubs/${fName}`;

      const { error: upErr } = await supabase.storage
        .from("club-images")
        .upload(filePath, file);

      if (upErr) {
        if (
          upErr.message?.includes("bucket") ||
          upErr.message?.includes("policy")
        ) {
          try {
            return getPublicUrl("club-images", filePath);
          } catch {
            throw upErr;
          }
        }
        throw upErr;
      }

      return getPublicUrl("club-images", filePath);
    } catch (error: unknown) {
      console.error("Image upload error:", error);
      return null;
    }
  };

  const onSubmit = async (data: NewClubFormData) => {
    if (!user) {
      toast({
        title: t("toast.errorTitle"),
        description: t("newClub.toastLoginError"),
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);
    setServerError(null);

    try {
      const clubIdentifier = generateClubIdentifier();
      let imageUrl: string | null = selectedDefaultUrl;

      if (imageFile) {
        try {
          imageUrl = await uploadImage(imageFile);
          if (!imageUrl) {
            toast({
              title: t("newClub.toastImageFailed"),
              description: t("newClub.toastImageFailed"),
              variant: "default",
              duration: 1500,
            });
          }
        } catch (error) {
          console.error("Error uploading image:", error);
        }
      }

      await ensurePositionsExist();

      const { data: clubData, error: clubError } = await supabase
        .from("clubs")
        .insert({
          name: data.name,
          description: data.description?.trim() || null,
          image_url: imageUrl,
          created_by: user.id,
          slug: clubIdentifier,
          city: location?.city ?? null,
          country: location?.country ?? null,
          country_code: location?.countryCode ?? null,
          is_club_discoverable: data.is_club_discoverable ?? false,
        })
        .select("id")
        .single();

      if (clubError) throw clubError;
      if (!clubData || !clubData.id) throw new Error("Failed to create club");

      try {
        await addClubAdmin(clubData.id, user.id);
      } catch (adminError) {
        console.error("Error adding user as admin:", adminError);
      }

      toast({
        title: t("newClub.toastCreatedTitle"),
        description: t("newClub.toastCreatedDescription"),
        duration: 1500,
      });

      setClubId(clubData.id);
      localStorage.setItem("lastVisitedClub", clubData.id);
      navigate(`/invite-members/${clubData.id}`);
    } catch (error: unknown) {
      console.error("Error creating club:", error);
      const msg =
        error instanceof Error
          ? error.message
          : t("newClub.toastDefaultError");
      setServerError(msg);
      toast({
        title: t("toast.errorTitle"),
        description: msg,
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed header */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-background border-b border-border">
        <div className="flex items-center justify-center relative h-14 px-4">
          <button
            onClick={() => navigate("/clubs")}
            className="absolute left-4 h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-semibold">{t("newClub.title")}</h1>
        </div>
      </div>
      <div className="h-14" />

      {/* Form content */}
      <div className="flex-1 overflow-y-auto pb-28">
        <form
          id="new-club-form"
          onSubmit={handleSubmit(onSubmit)}
          className="max-w-lg mx-auto px-4 pt-6 space-y-6"
        >
          {serverError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
              {serverError}
            </div>
          )}

          {/* Club Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t("newClub.clubName")}</Label>
            <Input
              placeholder={t("newClub.clubNamePlaceholder")}
              className="h-12 bg-muted/50 border-border"
              {...register("name", { required: t("newClub.clubNameRequired") })}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              {t("newClub.description")}
            </Label>
            <Textarea
              placeholder={t("newClub.descriptionPlaceholder")}
              className="bg-muted/50 border-border resize-none min-h-[80px]"
              maxLength={200}
              {...register("description")}
            />
            <p className="text-xs text-muted-foreground text-right">
              {watch("description")?.length ?? 0}/200
            </p>
          </div>

          {/* City */}
          <div className="space-y-2">
            <CityLocationSelector
              value={location}
              onChange={setLocation}
              label={t("settings.manualCity")}
              placeholder={t("newClub.cityPlaceholder")}
            />
            {location && (
              <p className="text-xs text-muted-foreground">
                {location.city}{location.country ? `, ${location.country}` : ""}
              </p>
            )}
          </div>

          {/* Club Image */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              {t("newClub.clubImage")}
            </Label>

            {/* Default image grid */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">
                  {t("newClub.pickDefault")}
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
              <span className="text-xs text-muted-foreground">{t("newClub.orUpload")}</span>
              <div className="flex-1 border-t border-border" />
            </div>

            {/* Custom upload */}
            <div>
              <label
                htmlFor="club-image-upload"
                className="cursor-pointer inline-block"
              >
                <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-border rounded-lg hover:border-muted-foreground transition-colors bg-muted/30 w-fit">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {imagePreview ? t("newClub.changePhoto") : t("newClub.uploadPhoto")}
                  </span>
                </div>
              </label>
              <input
                key={fileInputKey}
                id="club-image-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageChange(file);
                }}
              />

              {imagePreview && (
                <div className="mt-2 flex items-center gap-3">
                  <img
                    src={imagePreview}
                    alt="Upload preview"
                    className="h-14 w-14 rounded-lg object-cover border border-border"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm text-green-600 dark:text-green-400 truncate max-w-[200px]">
                      {fileName}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearSelectedImage}
                      className="text-red-500 hover:text-red-600 text-xs font-medium text-left"
                      aria-label={t("newClub.removeImage")}
                    >
                      {t("newClub.removeImage")}
                    </button>
                  </div>
                </div>
              )}

              {uploadError && (
                <p className="mt-1 text-sm text-destructive">{uploadError}</p>
              )}
            </div>
          </div>

          {/* Discoverability toggle */}
          <Controller
            name="is_club_discoverable"
            control={control}
            render={({ field }) => (
              <div className="flex items-center justify-between py-3 border-t border-border">
                <div className="flex items-center gap-2">
                  <Label htmlFor="is_club_discoverable" className="m-0 text-sm">
                    {t("newClub.discoverableLabel")}
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
                    <PopoverContent
                      align="start"
                      sideOffset={8}
                      avoidCollisions
                      collisionPadding={12}
                      className="text-sm max-w-xs rounded-md border bg-popover p-3 text-popover-foreground shadow-md"
                    >
                      {t("newClub.discoverableHelp")}
                    </PopoverContent>
                  </Popover>
                </div>
                <Switch
                  id="is_club_discoverable"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=unchecked]:bg-muted data-[state=checked]:bg-primary"
                />
              </div>
            )}
          />
        </form>
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-lg mx-auto">
          <Button
            type="submit"
            form="new-club-form"
            className="w-full h-12"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                {t("newClub.creating")}
              </>
            ) : (
              t("newClub.createClub")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewClub;
