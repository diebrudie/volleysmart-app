import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  linkTo?: string;
}

const Logo = ({ size = "md", linkTo = "/" }: LogoProps) => {
  const { isAuthenticated } = useAuth();
  
  const destination = isAuthenticated ? "/dashboard" : "/";
  
  const finalLinkTo = (linkTo !== "/" || !isAuthenticated) ? linkTo : destination;

  const sizeClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-12",
  };

  const logoElement = (
    <img 
      src="/lovable-uploads/e54f46fd-5eab-4f09-94df-48c27897b119.png" 
      alt="VolleyMatch Logo" 
      className={sizeClasses[size]} 
    />
  );

  if (finalLinkTo) {
    return (
      <Link to={finalLinkTo} className="flex items-center">
        {logoElement}
      </Link>
    );
  }

  return logoElement;
};

export default Logo;
