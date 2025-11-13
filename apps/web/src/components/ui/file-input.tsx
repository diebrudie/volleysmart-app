
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FileInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onImageSelected?: (file: File) => void;
  buttonText?: string;
}

const FileInput = React.forwardRef<HTMLInputElement, FileInputProps>(
  ({ className, onImageSelected, buttonText = "Choose file", ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    
    const handleClick = () => {
      inputRef.current?.click();
    };
    
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files && event.target.files[0]) {
        if (onImageSelected) {
          onImageSelected(event.target.files[0]);
        }
      }
    };
    
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <Button 
          type="button"
          variant="outline"
          onClick={handleClick}
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300"
        >
          {buttonText}
        </Button>
        <input
          type="file"
          className="hidden"
          onChange={handleChange}
          ref={inputRef}
          {...props}
        />
      </div>
    );
  }
);

FileInput.displayName = "FileInput";

export { FileInput };
