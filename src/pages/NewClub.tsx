import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Upload } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { FileInput } from "@/components/ui/file-input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Spinner } from "@/components/ui/spinner";
import { ensurePositionsExist } from "@/integrations/supabase/positions";
import { getPublicUrl } from "@/integrations/supabase/storage";
import { addClubAdmin } from "@/integrations/supabase/club";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useClub } from "@/contexts/ClubContext";
import CityLocationSelector, {
  LocationValue,
} from "@/components/forms/CityLocationSelector";
import { Controller } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { HelpCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface NewClubFormData {
  name: string;
  description?: string;
  city?: string;
  country?: string;
  country_code?: string; // ISO-3166-1 alpha-2 (uppercase)
  is_club_discoverable: boolean;
}

const NewClub = () => {
  const {
    register,
    handleSubmit,
    control, // ← needed by Controller
    formState: { errors },
  } = useForm<NewClubFormData>({
    defaultValues: {
      is_club_discoverable: false,
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Image selection + preview state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState<number>(0); // used to reset FileInput
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [location, setLocation] = useState<LocationValue | null>(null);

  const handleBack = () => {
    // Use browser's history to go back to the previous page
    window.history.back();
  };

  const [showManual, setShowManual] = useState(false);
  const hasMapbox = Boolean(
    import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
  );

  // If no Mapbox token, default to manual entry.
  useEffect(() => {
    if (!hasMapbox) setShowManual(true);
  }, [hasMapbox]);

  // Generate a random 5 character identifier with capital letters and numbers
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
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Clear the selected file (create flow).
   * Resets local preview and re-mounts the FileInput via key to clear its internal value.
   */
  const handleClearSelectedImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFileName(null);
    setFileInputKey((k) => k + 1);
  };

  const { setClubId } = useClub();

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      // Generate unique filename to avoid collisions
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `clubs/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("club-images")
        .upload(filePath, file);

      if (uploadError) {
        // Check if it's a bucket-related error we can ignore
        if (
          uploadError.message?.includes("bucket") ||
          uploadError.message?.includes("policy")
        ) {
          console.warn(
            "Storage policy error (bucket exists):",
            uploadError.message
          );
          // Try to get the public URL anyway
          try {
            return getPublicUrl("club-images", filePath);
          } catch {
            throw uploadError;
          }
        }
        throw uploadError;
      }

      return getPublicUrl("club-images", filePath);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Image upload error:", error.message);
      } else {
        console.error("Unknown error:", error);
      }
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
      // Generate a random identifier for the club
      const clubIdentifier = generateClubIdentifier();

      let imageUrl = null;

      // Handle image upload if provided
      if (imageFile) {
        try {
          imageUrl = await uploadImage(imageFile);

          if (!imageUrl) {
            toast({
              title: "Notice",
              description:
                "Image upload failed, but club will be created without an image.",
              variant: "default",
              duration: 1500,
            });
          }
        } catch (error) {
          // Continue without image if upload fails
          console.error("Error uploading image:", error);
        }
      }

      // Ensure standard volleyball positions exist in the database
      await ensurePositionsExist();

      // Insert club data
      const { data: clubData, error: clubError } = await supabase
        .from("clubs")
        .insert({
          name: data.name,
          // description: data.description || null,
          image_url: imageUrl,
          created_by: user.id,
          slug: clubIdentifier,
          city: location?.city ?? (data.city || null),
          country: location?.country ?? (data.country || null),
          country_code: location?.countryCode ?? (data.country_code || null),
          is_club_discoverable: data.is_club_discoverable ?? false,
        })
        .select("id")
        .single();

      if (clubError) {
        throw clubError;
      }

      if (!clubData || !clubData.id) {
        throw new Error("Failed to create club: No club data returned");
      }

      // Add the user as a club admin
      try {
        await addClubAdmin(clubData.id, user.id);

        toast({
          title: "Club created!",
          description: "Your club has been created successfully.",
          duration: 1500,
        });

        // Navigate to invite members page with club id as parameter
        setClubId(clubData.id); // ✅ Context
        localStorage.setItem("lastVisitedClub", clubData.id); // ✅ Fallback on reload
        navigate(`/invite-members/${clubData.id}`);
      } catch (adminError: unknown) {
        console.error("Error adding user as admin:", adminError);

        // Even if there's an admin error, the club was created
        // Let the user proceed as they are the club creator
        toast({
          title: "Club created",
          description:
            "Your club was created successfully. You can proceed as the club creator.",
          duration: 1500,
        });

        setClubId(clubData.id); // ✅ Context
        localStorage.setItem("lastVisitedClub", clubData.id); // ✅ Fallback on reload
        navigate(`/invite-members/${clubData.id}`);
      }
    } catch (error: unknown) {
      console.error("Error creating club:", error);

      setServerError(
        error instanceof Error
          ? error.message
          : "Failed to create club. Please try again."
      );

      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to create club. Please try again.",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-lg">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-6 p-0 h-auto font-normal text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-transparent dark:hover:bg-transparent"
          icon={<ArrowLeft className="h-4 w-4" />}
        >
          Back
        </Button>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
          <h1 className="text-2xl font-semibold text-left mb-6 text-gray-900 dark:text-gray-100">
            Create a New Club
          </h1>

          {serverError && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">What's the name of your Club?</Label>
              <Input
                id="name"
                placeholder="Club name"
                {...register("name", { required: "Club name is required" })}
              />
              {errors.name && (
                <p className="text-sm text-red-500 dark:text-red-400">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* City (autocomplete with Mapbox) */}
            <div className="space-y-3">
              <CityLocationSelector
                value={location}
                onChange={setLocation}
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

              {/* Manual fields (hidden by default) */}
              {showManual && !location && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label>City</Label>
                    <Input placeholder="e.g., Berlin" {...register("city")} />
                  </div>
                  <div>
                    <Label>Country</Label>
                    <Input
                      placeholder="e.g., Germany"
                      {...register("country")}
                    />
                  </div>
                  <div>
                    <Label>Country code</Label>
                    <Input
                      placeholder="e.g., DE"
                      {...register("country_code", {
                        setValueAs: (v) =>
                          typeof v === "string" ? v.toUpperCase() : v,
                        maxLength: {
                          value: 2,
                          message: "Use 2 letters (ISO alpha-2)",
                        },
                      })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Discoverability toggle */}
            <Controller
              name="is_club_discoverable"
              control={control}
              render={({ field }) => (
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
                        If enabled, others can find this club on the Discover
                        page.
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      id="is_club_discoverable"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                </div>
              )}
            />

            <div className="space-y-2">
              <Label htmlFor="club-image">Club Image (optional)</Label>

              {/* Responsive layout: avatar left, actions + filename on the right */}
              <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                {/* Left: circular preview (Avatar) */}
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
                </div>

                {/* Right: dashed upload button and filename line */}
                <div className="flex-1">
                  {/* Upload button (dashed, same feel as onboarding) */}
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

                  {/* File name (green) + red × to clear (create flow) */}
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

                  {/* Validation or upload errors */}
                  {uploadError && (
                    <p className="mt-2 text-sm text-red-500 dark:text-red-400">
                      {uploadError}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              type="submit"
              disabled={isSubmitting}
              className="w-full"
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
          </form>
        </div>
      </div>
    </div>
  );
};

export default NewClub;
