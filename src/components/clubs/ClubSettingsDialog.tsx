
import { useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ClubSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  club: {
    id: string;
    name: string;
    image_url: string | null;
    description?: string;
  };
}

const ClubSettingsDialog = ({ isOpen, onClose, club }: ClubSettingsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState(club.name);
  const [description, setDescription] = useState(club.description || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleSave = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      let imageUrl = club.image_url;

      // Upload new image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${club.id}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('club-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('club-images')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl;
      }

      // Update club
      const { error } = await supabase
        .from('clubs')
        .update({
          name,
          description,
          image_url: imageUrl,
        })
        .eq('id', club.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Club updated successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['userClubs'] });
      onClose();
    } catch (error) {
      console.error('Error updating club:', error);
      toast({
        title: "Error",
        description: "Failed to update club",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user?.id) return;
    
    try {
      // Delete club (this will cascade delete members, matches, etc.)
      const { error } = await supabase
        .from('clubs')
        .delete()
        .eq('id', club.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Club deleted successfully",
      });

      queryClient.invalidateQueries({ queryKey: ['userClubs'] });
      setShowDeleteDialog(false);
      onClose();
    } catch (error) {
      console.error('Error deleting club:', error);
      toast({
        title: "Error",
        description: "Failed to delete club",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Club Settings</DialogTitle>
            <DialogDescription>
              Edit your club details or delete the club.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="club-name">Club Name</Label>
              <Input
                id="club-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter club name"
              />
            </div>

            <div>
              <Label htmlFor="club-description">Description</Label>
              <Textarea
                id="club-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter club description"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="club-image">Club Image</Label>
              <Input
                id="club-image"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <DialogFooter className="flex-col space-y-2">
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={isLoading || !name.trim()}
                className="flex-1"
              >
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
            </div>
            
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="w-full"
            >
              Delete Club
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the club
              "{club.name}" and all associated data including matches, teams, and member records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Club
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ClubSettingsDialog;
