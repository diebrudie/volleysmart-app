import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  linkTo?: string;
  forceTheme?: "light" | "dark"; // Add this new prop
}

const Logo = ({ size = "md", linkTo = "/", forceTheme }: LogoProps) => {
  const { isAuthenticated } = useAuth();
  const { isDark } = useTheme();

  const destination = isAuthenticated ? "/dashboard" : "/";

  const finalLinkTo = linkTo !== "/" || !isAuthenticated ? linkTo : destination;

  const sizeClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-12",
  };

  // Choose logo based on theme or forceTheme prop
  let logoSrc;
  if (forceTheme) {
    logoSrc =
      forceTheme === "dark" ? "/logo-darkmode.svg" : "/logo-lightmode.svg";
  } else if (!isAuthenticated) {
    // Always use dark logo for homepage when not authenticated
    logoSrc = "/logo-darkmode.svg";
  } else {
    // Use theme-based logo for authenticated users
    logoSrc = isDark ? "/logo-darkmode.svg" : "/logo-lightmode.svg";
  }

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
