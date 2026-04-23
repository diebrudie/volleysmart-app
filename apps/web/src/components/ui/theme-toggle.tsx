import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type ThemeToggleProps = Omit<ButtonProps, "onClick"> & {
  showLabel?: boolean;
};

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, showLabel, ...props }) => {
  const { setTheme, isDark } = useTheme();

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={cn(
        // shape & transitions
        "h-9 w-9 p-2 rounded-md transition-colors",
        // BACKGROUND on hover/focus
        "hover:bg-gray-100 focus:bg-gray-100",
        "dark:hover:bg-gray-800 dark:focus:bg-gray-800",
        // TEXT (icon) COLORS: ensure contrast on hover in both themes
        "text-gray-600 hover:text-gray-900",
        "dark:text-gray-300 dark:hover:text-gray-100",
        className
      )}
      {...props}
    >
      {isDark ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
      {showLabel && <span>Theme</span>}
    </Button>
  );
};

export default ThemeToggle;
