import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useMemo,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

// Theme types
type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  toggleTheme: () => void;
  /** True when provider is currently enforcing light mode (no persistence). */
  enforcingLight: boolean;
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

// Storage keys
const STORAGE_KEY = "volleymatch-theme";
const LEGACY_KEYS = ["theme", "vm-theme"];

// Helpers
const getSystemTheme = (): "light" | "dark" => {
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
};

// Helper function to resolve actual theme
const resolveTheme = (theme: Theme): "light" | "dark" =>
  theme === "system" ? getSystemTheme() : theme;

function normalizePath(p: string): string {
  // remove trailing slashes except for root
  return p.length > 1 ? p.replace(/\/+$/, "") : p;
}

function routeMatches(
  pathname: string,
  patterns: Array<string | RegExp>
): boolean {
  const path = normalizePath(pathname);
  return patterns.some((p) => {
    if (typeof p === "string") {
      const pat = normalizePath(p);
      // exact match OR prefix match (handles nested steps and optional trailing slash)
      return path === pat || path.startsWith(pat + "/");
    }
    return p.test(pathname);
  });
}

interface ThemeProviderProps {
  children: ReactNode;
  /** Provided by App, not strictly required for enforcement but kept for compatibility. */
  isAuthenticated?: boolean;
  enforceLightOnRoutes?: Array<string | RegExp>;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  isAuthenticated = true,
  enforceLightOnRoutes = [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/players/onboarding",
  ],
}) => {
  const { user } = useAuth(); // Auth source of truth
  const location = useLocation();
  const pathname = location.pathname;

  // Should we enforce light for this route?
  const enforcingLight = useMemo(
    () => routeMatches(pathname, enforceLightOnRoutes),
    [pathname, enforceLightOnRoutes]
  );

  // Initialize from localStorage only when we're NOT enforcing light.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (enforcingLight) return "light";
    if (typeof window !== "undefined") {
      // Try current key
      const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (saved === "light" || saved === "dark" || saved === "system") {
        return saved;
      }
      // Migrate legacy keys (once)
      for (const k of LEGACY_KEYS) {
        const legacy = localStorage.getItem(k) as Theme | null;
        if (legacy === "light" || legacy === "dark" || legacy === "system") {
          try {
            localStorage.setItem(STORAGE_KEY, legacy);
            localStorage.removeItem(k);
          } catch {
            /* ignore */
          }
          return legacy;
        }
      }
      // Fallback
      return "light";
    }
    return "light";
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    // Detect from <html> on mount for immediate SSR/refresh correctness
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return resolveTheme(theme) === "dark" && !enforcingLight;
  });

  // Safely write localStorage
  const writeLocal = (t: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, t);
      // clean legacy
      for (const k of LEGACY_KEYS) localStorage.removeItem(k);
    } catch {
      /* ignore */
    }
  };

  // Persist to Supabase user_profiles:
  // DB allows only 'light' | 'dark' (nullable). We encode:
  //   - theme === 'system'  -> store NULL
  //   - theme === 'light'/'dark' -> store same value
  const persistRemote = async (t: Theme) => {
    if (!user) return; // only persist when authenticated
    const dbValue = t === "system" ? null : t;
    const { error } = await supabase
      .from("user_profiles")
      .update({
        theme: dbValue,
        theme_updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      // Keep UI responsive even if remote write fails
      console.error("Theme persistence failed:", error);
    }
  };

  // Public setter: updates state + localStorage; remote (fire-and-forget)
  const setTheme = (newTheme: Theme) => {
    if (enforcingLight) {
      // Ignore writes before authenticated/allowed routes
      setThemeState("light");
      setIsDark(false);
      document.documentElement.classList.remove("dark");
      return;
    }

    setThemeState(newTheme);
    const resolved = resolveTheme(newTheme);
    const isDarkResolved = resolved === "dark";

    // update immediately
    setIsDark(isDarkResolved);

    const root = document.documentElement;
    if (isDarkResolved) root.classList.add("dark");
    else root.classList.remove("dark");

    writeLocal(newTheme);
    void persistRemote(newTheme);
  };

  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  // When enforcement turns off (e.g., after redirect into a private route),
  // re-hydrate the saved theme immediately so the UI updates without a reload.
  useEffect(() => {
    if (enforcingLight) return;

    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (saved === "light" || saved === "dark" || saved === "system") {
        setThemeState(saved);
        // The DOM class will be applied via the useLayoutEffect above.
      }
    }
  }, [enforcingLight]);

  // React to system theme changes ONLY when not enforcing light and theme === 'system'
  useEffect(() => {
    if (enforcingLight || theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const resolved = getSystemTheme();
      setIsDark(resolved === "dark");

      const root = document.documentElement;
      if (resolved === "dark") root.classList.add("dark");
      else root.classList.remove("dark");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, enforcingLight]);

  // small sync effect so isDark updates if the DOM or theme changes asynchronously
  useEffect(() => {
    const htmlHasDark = document.documentElement.classList.contains("dark");
    if (htmlHasDark !== isDark) setIsDark(htmlHasDark);
  }, [theme, enforcingLight, isDark]);

  // On auth change (and when not enforcing light), load remote preference
  // DB: NULL => 'system', 'light'/'dark' => explicit choice
  useEffect(() => {
    if (enforcingLight || !user) return;

    let isMounted = true;

    (async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("theme, theme_updated_at")
        .eq("id", user.id)
        .single();

      if (error) {
        console.warn("Theme: profile fetch failed/skipped", error);
        return;
      }
      if (!isMounted) return;

      const remoteTheme: Theme =
        data?.theme === "light" || data?.theme === "dark"
          ? data.theme
          : "system";

      setThemeState(remoteTheme);
      writeLocal(remoteTheme);
      // DOM class will update via the effect watching `theme`
    })();

    return () => {
      isMounted = false;
    };
  }, [user, enforcingLight]);

  const value: ThemeContextType = {
    theme,
    setTheme,
    isDark,
    toggleTheme,
    enforcingLight,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export default ThemeContext;
