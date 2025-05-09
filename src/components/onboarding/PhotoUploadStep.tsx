
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Camera } from "lucide-react";

interface PhotoUploadStepProps {
  imagePreview: string | null;
  setImagePreview: (preview: string | null) => void;
}

const PhotoUploadStep = ({ imagePreview, setImagePreview }: PhotoUploadStepProps) => {
  const { setValue } = useFormContext();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a preview for the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // In a real implementation, you would upload the file to storage
      // This is a placeholder for now
      setValue("imageUrl", URL.createObjectURL(file), { shouldValidate: true });
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Add your profile picture</h2>
      <p className="text-sm text-gray-500">
        This helps teammates recognize you (optional)
      </p>
      
      <div className="flex flex-col items-center justify-center pt-4">
        {imagePreview ? (
          <div className="mb-6">
            <div className="relative inline-block">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-full border-4 border-primary"
              />
              <button
                onClick={() => {
                  setImagePreview(null);
                  setValue("imageUrl", "", { shouldValidate: true });
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                type="button"
              >
                ✕
              </button>
            </div>
          </div>
        ) : (
          <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center mb-6">
            <Camera className="h-10 w-10 text-gray-400" />
          </div>
        )}
        
        <label 
          htmlFor="photo-upload" 
          className="cursor-pointer bg-primary/10 hover:bg-primary/20 text-primary font-medium py-2 px-4 rounded transition-colors"
        >
          {imagePreview ? "Change photo" : "Upload photo"}
        </label>
        <Input
          id="photo-upload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default PhotoUploadStep;
