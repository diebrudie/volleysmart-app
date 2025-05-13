
import { useState } from "react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  aspectRatio?: number;
  className?: string;
  containerClassName?: string;
  fallback?: string;
}

const Image = ({
  aspectRatio = 16 / 9,
  className,
  containerClassName,
  fallback = "/placeholder.svg",
  alt = "",
  src,
  ...props
}: ImageProps) => {
  const [error, setError] = useState(false);

  return (
    <div className={cn("overflow-hidden rounded-md", containerClassName)}>
      <AspectRatio ratio={aspectRatio}>
        <img
          src={error ? fallback : src}
          alt={alt}
          className={cn("object-cover w-full h-full", className)}
          onError={() => setError(true)}
          {...props}
        />
      </AspectRatio>
    </div>
  );
};

export default Image;
