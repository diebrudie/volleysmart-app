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

interface ClubSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  club: {
    id: string;
    name: string;
    image_url: string | null;
    slug: string; // NEW: 5-char Club ID
    // description?: string; // (optional) keep only if you still need it elsewhere
  };
}

const ClubSettingsDialog = ({
  isOpen,
  onClose,
  club,
}: ClubSettingsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState(club.name);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset form when dialog opens with new club data
  useEffect(() => {
    if (isOpen) {
      setName(club.name);
      setImageFile(null);
    }
  }, [isOpen, club.name]);

  const handleImageChange = (file: File) => {
    setImageFile(file);
  };

  // Check if there are any changes
  const hasChanges = name.trim() !== club.name || imageFile !== null;

  const handleSave = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      let imageUrl = club.image_url;

      // Upload new image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split(".").pop();
        const fileName = `${club.id}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("club-images")
          .upload(fileName, imageFile);

        if (uploadError) {
          // Handle bucket/policy errors gracefully
          if (
            uploadError.message?.includes("bucket") ||
            uploadError.message?.includes("policy")
          ) {
            console.warn("Storage policy warning:", uploadError.message);
            // Continue without image update
          } else {
            throw uploadError;
          }
        } else {
          const {
            data: { publicUrl },
          } = supabase.storage.from("club-images").getPublicUrl(fileName);

          imageUrl = publicUrl;
        }
      }

      // Update club (rest of the function remains the same)
      const { error } = await supabase
        .from("clubs")
        .update({
          name,
          image_url: imageUrl,
        })
        .eq("id", club.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Club updated successfully",
        duration: 2000,
      });

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

          <div className="flex flex-col gap-2">
            <Label htmlFor="club-image">Club Image</Label>
            <FileInput
              id="club-image"
              accept="image/*"
              buttonText="Update club image"
              onImageSelected={handleImageChange}
            />
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
