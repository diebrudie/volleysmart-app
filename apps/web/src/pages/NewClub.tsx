import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Upload, ArrowLeft, HelpCircle } from "lucide-react";
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
  const {
    register,
    handleSubmit,
    control,
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
  const { setClubId } = useClub();


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
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleClearSelectedImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFileName(null);
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
        title: "Error",
        description: "You must be logged in to create a club",
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
      let imageUrl = null;

      if (imageFile) {
        try {
          imageUrl = await uploadImage(imageFile);
          if (!imageUrl) {
            toast({
              title: "Notice",
              description: "Image upload failed, but club will be created without an image.",
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
        title: "Club created!",
        description: "Your club has been created successfully.",
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
          : "Failed to create club. Please try again.";
      setServerError(msg);
      toast({
        title: "Error",
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
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-background border-b border-border">
        <div className="flex items-center justify-center relative h-14 px-4">
          <button
            onClick={() => navigate("/clubs")}
            className="absolute left-4 h-9 w-9 rounded-full border border-border flex items-center justify-center hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-semibold">Create a Club</h1>
        </div>
      </div>

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
            <Label className="text-sm font-medium text-foreground">Club Name</Label>
            <Input
              placeholder="e.g., Beach Volleyball Berlin"
              className="h-12 bg-muted/50 border-border"
              {...register("name", { required: "Club name is required" })}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* City */}
          <div className="space-y-2">
            <CityLocationSelector
              value={location}
              onChange={setLocation}
              label="City"
              placeholder="Type the city your Club is located..."
            />
            {location && (
              <p className="text-xs text-muted-foreground">
                {location.city}{location.country ? `, ${location.country}` : ""}
              </p>
            )}
          </div>

          {/* Club Image */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">
              Club Image (optional)
            </Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 shrink-0">
                <AvatarImage
                  src={imagePreview || ""}
                  alt="Club preview"
                  className="object-cover"
                />
                <AvatarFallback className="bg-muted text-2xl">
                  {"\uD83D\uDCF7"}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <label
                  htmlFor="club-image-upload"
                  className="cursor-pointer inline-block"
                >
                  <div className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-border rounded-lg hover:border-muted-foreground transition-colors bg-muted/30 w-fit">
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
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
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-green-600 dark:text-green-400">
                      {fileName}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearSelectedImage}
                      className="text-red-500 hover:text-red-600 text-sm font-medium"
                      aria-label="Remove selected image"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {uploadError && (
                  <p className="mt-1 text-sm text-destructive">{uploadError}</p>
                )}
              </div>
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
                    <PopoverContent
                      align="start"
                      sideOffset={8}
                      avoidCollisions
                      collisionPadding={12}
                      className="text-sm max-w-xs rounded-md border bg-popover p-3 text-popover-foreground shadow-md"
                    >
                      If enabled, others can find this club on the Discover page.
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
                Creating...
              </>
            ) : (
              "Create Club"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewClub;
