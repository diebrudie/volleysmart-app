import React from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor } from "lucide-react";

const ThemeToggle: React.FC = () => {
  const { theme, setTheme, isDark } = useTheme();

  const handleToggle = () => {
    // Simple toggle between light and dark (you can enhance this later)
    if (isDark) {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      className="h-9 w-9 px-0 hover:bg-gray-100 dark:hover:bg-gray-800"
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
};

export default ThemeToggle;
