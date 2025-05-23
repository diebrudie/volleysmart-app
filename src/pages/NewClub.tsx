
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileInput } from '@/components/ui/file-input';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui/spinner';
import { ensurePositionsExist } from '@/integrations/supabase/positions';
import { ensureStorageBucketExists, getPublicUrl } from '@/integrations/supabase/storage';
import { addClubAdmin } from '@/integrations/supabase/club';

interface NewClubFormData {
  name: string;
  description?: string;
}

const NewClub = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<NewClubFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [bucketReady, setBucketReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Ensure storage bucket exists on component mount
  useEffect(() => {
    const initStorage = async () => {
      try {
        await ensureStorageBucketExists('club-images');
        setBucketReady(true);
      } catch (error) {
        console.error('Failed to ensure storage bucket exists:', error);
        // Continue anyway - the bucket might already exist on the server
        setBucketReady(true);
      }
    };
    
    initStorage();
  }, []);

  // Generate a random 5 character identifier with capital letters and numbers
  const generateClubIdentifier = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
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

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      if (!bucketReady) {
        // Try again just to be safe
        try {
          await ensureStorageBucketExists('club-images');
        } catch (e) {
          console.log('Last attempt to ensure bucket exists failed, continuing anyway');
        }
      }
      
      // Generate unique filename to avoid collisions
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `clubs/${fileName}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('club-images')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      return getPublicUrl('club-images', filePath);
    } catch (error: any) {
      console.error('Image upload error:', error);
      setUploadError(`Image upload failed: ${error.message}`);
      return null;
    }
  };

  const onSubmit = async (data: NewClubFormData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a club",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);
    
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
              description: "Image upload failed, but club will be created without an image.",
              variant: "default"
            });
          }
        } catch (error) {
          // Continue without image if upload fails
          console.error('Error uploading image:', error);
        }
      }
      
      // Ensure standard volleyball positions exist in the database
      await ensurePositionsExist();
      
      // Insert club data
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .insert({
          name: data.name,
          description: data.description || null,
          image_url: imageUrl,
          created_by: user.id,
          slug: clubIdentifier
        })
        .select()
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
      } catch (adminError: any) {
        console.error('Error adding user as admin:', adminError);
        
        toast({
          title: "Notice",
          description: "Club was created, but there was an issue setting you as the admin. Please contact support.",
          variant: "default"
        });
      }
      
      toast({
        title: "Club created!",
        description: "Your club has been created successfully."
      });
      
      // Navigate to invite members page with club id as parameter
      navigate(`/invite-members/${clubData.id}`);
      
    } catch (error: any) {
      console.error('Error creating club:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create club. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-semibold text-center mb-6">Create a New Club</h1>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">What's the name of your Club?</Label>
            <Input 
              id="name"
              placeholder="Club name"
              {...register("name", { required: "Club name is required" })}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea 
              id="description"
              placeholder="Tell us about your club"
              {...register("description")}
            />
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
              <p className="text-sm text-red-500">{uploadError}</p>
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
              'Create Club'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default NewClub;
