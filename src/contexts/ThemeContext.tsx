import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

// Theme types
type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  toggleTheme: () => void;
}

// Create context
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

// Helper function to get system preference
const getSystemTheme = (): "light" | "dark" => {
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
};

// Helper function to resolve actual theme
const resolveTheme = (theme: Theme): "light" | "dark" => {
  if (theme === "system") {
    return getSystemTheme();
  }
  return theme;
};

interface ThemeProviderProps {
  children: ReactNode;
  isAuthenticated?: boolean;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  isAuthenticated = true,
}) => {
  /**
   * Initialize theme from localStorage or default to 'light'
   * Rationale: make light the default for first-time users, while preserving
   * any explicit user choice saved in localStorage.
   */
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("volleymatch-theme") as Theme;
      return savedTheme || "light";
    }
    return "light";
  });

  // Calculate if we're in dark mode
  const [isDark, setIsDark] = useState<boolean>(() => {
    return resolveTheme(theme) === "dark";
  });

  // Function to update theme
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("volleymatch-theme", newTheme);
  };

  // Toggle between light and dark (ignoring system)
  const toggleTheme = () => {
    const newTheme = isDark ? "light" : "dark";
    setTheme(newTheme);
  };

  // Effect to handle theme changes and system preference changes
  useEffect(() => {
    // Apply theme logic for both authenticated and unauthenticated users
    const resolvedTheme = resolveTheme(theme);
    setIsDark(resolvedTheme === "dark");

    // Apply theme to document
    const root = document.documentElement;
    if (resolvedTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Listen for system theme changes if theme is 'system'
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        const newResolvedTheme = getSystemTheme();
        setIsDark(newResolvedTheme === "dark");

        const root = document.documentElement;
        if (newResolvedTheme === "dark") {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }
      }
    };

    if (theme === "system") {
      mediaQuery.addEventListener("change", handleChange);
    }

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [theme, isAuthenticated]);

  const value: ThemeContextType = {
    theme,
    setTheme,
    isDark,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export default ThemeContext;
