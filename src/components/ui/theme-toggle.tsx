import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type ThemeToggleProps = Omit<ButtonProps, "onClick">;

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, ...props }) => {
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
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
};

export default ThemeToggle;
