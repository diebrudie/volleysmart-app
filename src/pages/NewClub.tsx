
import { useState } from 'react';
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
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

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
          // First check if the bucket exists
          const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
          
          if (bucketsError) {
            throw new Error(`Error checking storage buckets: ${bucketsError.message}`);
          }
          
          const bucketExists = buckets.some(bucket => bucket.name === 'club-images');
          
          if (!bucketExists) {
            throw new Error("Club images storage is not configured properly. Please contact support.");
          }
          
          const fileExt = imageFile.name.split('.').pop();
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `clubs/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('club-images')
            .upload(filePath, imageFile);
            
          if (uploadError) throw uploadError;
          
          imageUrl = supabase.storage.from('club-images').getPublicUrl(filePath).data.publicUrl;
        } catch (error: any) {
          console.error('Image upload error:', error);
          setUploadError(`Image upload failed: ${error.message}`);
          // Continue without image if upload fails
          toast({
            title: "Warning",
            description: "Image upload failed, but club will be created without an image.",
            variant: "destructive"
          });
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
        
      if (clubError) throw clubError;
      
      // Add user as club admin
      const { error: memberError } = await supabase
        .from('club_members')
        .insert({
          club_id: clubData.id,
          user_id: user.id,
          role: 'admin'
        });
        
      if (memberError) throw memberError;
      
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
