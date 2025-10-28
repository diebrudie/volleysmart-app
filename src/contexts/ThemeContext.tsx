import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "/";

  // Should we enforce light for this route?
  const enforcingLight = useMemo(
    () => routeMatches(pathname, enforceLightOnRoutes),
    [pathname, enforceLightOnRoutes]
  );

  // Initialize from localStorage only when we're NOT enforcing light.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (enforcingLight) return "light";
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("volleymatch-theme") as Theme | null;
      return saved || "light";
    }
    return "light";
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    return resolveTheme(theme) === "dark" && !enforcingLight;
  });

  // Safely write localStorage
  const writeLocal = (t: Theme) => {
    try {
      localStorage.setItem("volleymatch-theme", t);
    } catch {
      // ignore storage errors (private mode, quota, etc.)
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
      return;
    }
    setThemeState(newTheme);
    writeLocal(newTheme);
    // fire-and-forget remote save if authenticated
    void persistRemote(newTheme);
  };

  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  // Apply to DOM
  useEffect(() => {
    const root = document.documentElement;

    // Apply light-only mode when enforced
    if (enforcingLight) {
      setIsDark(false); // guarantee light
      root.classList.remove("dark");
      return;
    }

    // Normal theming rules
    const resolved = resolveTheme(theme);
    setIsDark(resolved === "dark");

    if (resolved === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme, enforcingLight, isAuthenticated]);

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
