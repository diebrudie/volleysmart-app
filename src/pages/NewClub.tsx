import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface NewClubFormData {
  name: string;
  description?: string;
}

const NewClub = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewClubFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBack = () => {
    // Use browser's history to go back to the previous page
    window.history.back();
  };

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
    setUploadError(null); // Clear any previous errors

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
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
          //description: data.description || null,
          image_url: imageUrl,
          created_by: user.id,
          slug: clubIdentifier,
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
          <h1 className="text-2xl font-semibold text-center mb-6 text-gray-900 dark:text-gray-100">
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

            <div className="space-y-2">
              <Label htmlFor="image">Upload an Image (optional)</Label>
              <FileInput
                id="image"
                accept="image/*"
                buttonText="Choose club image"
                onImageSelected={handleImageChange}
              />

              {uploadError && (
                <p className="text-sm text-red-500 dark:text-red-400">
                  {uploadError}
                </p>
              )}

              {imagePreview && (
                <div className="mt-2">
                  <img
                    src={imagePreview}
                    alt="Club preview"
                    className="h-32 w-32 object-cover rounded-md"
                  />
                </div>
              )}
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
