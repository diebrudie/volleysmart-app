import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  linkTo?: string;
}

const Logo = ({ size = "md", linkTo = "/" }: LogoProps) => {
  const { isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  const destination = isAuthenticated ? "/dashboard" : "/";

  const finalLinkTo = linkTo !== "/" || !isAuthenticated ? linkTo : destination;

  const sizeClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-12",
  };

  // Choose logo based on theme
  const logoSrc = isDark ? "/logo-darkmode.svg" : "/logo-lightmode.svg";

  const logoElement = (
    <img src={logoSrc} alt="VolleyMatch Logo" className={sizeClasses[size]} />
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
