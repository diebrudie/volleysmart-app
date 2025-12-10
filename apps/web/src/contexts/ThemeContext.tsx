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
  /** Resolved theme based on the DOM (<html>.dark) */
  resolvedTheme: "light" | "dark";
  /** True when the DOM is currently dark (single source of truth) */
  isDarkResolved: boolean;
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

const getDomIsDark = (): boolean =>
  typeof document !== "undefined" &&
  document.documentElement.classList.contains("dark");

const updateMetaThemeColor = (shouldBeDark: boolean) => {
  if (typeof document === "undefined") return;

  // Try to derive from CSS var so it tracks per-page/background tweaks.
  let color: string | null = null;
  try {
    const bg = getComputedStyle(document.documentElement).getPropertyValue(
      "--background"
    );
    if (bg) color = `hsl(${bg.trim()})`;
  } catch {
    /* ignore */
  }

  // Fall back to explicit colors used in index.html
  if (!color) {
    color = shouldBeDark ? "#020617" : "#f9fafb";
  }

  let meta = document.querySelector(
    'meta[name="theme-color"]'
  ) as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", color);
  // Clear media so the value always applies in standalone/PWA contexts.
  meta.removeAttribute("media");
};

const applyDomTheme = (shouldBeDark: boolean) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (shouldBeDark) {
    root.classList.add("dark");
    root.style.setProperty("color-scheme", "dark");
  } else {
    root.classList.remove("dark");
    root.style.setProperty("color-scheme", "light");
  }
  updateMetaThemeColor(shouldBeDark);
};

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

      // Root "/" must only match exactly "/"
      if (pat === "/") {
        return path === "/";
      }

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
  // default: assume NOT authenticated unless told otherwise
  isAuthenticated = false,
  enforceLightOnRoutes = [
    "/",
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/players/onboarding",
    "/faqs",
  ],
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;

  // Force light ONLY for non-authenticated users on these routes
  const enforcingLight = useMemo(
    () => !isAuthenticated && routeMatches(pathname, enforceLightOnRoutes),
    [pathname, enforceLightOnRoutes, isAuthenticated]
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

  const [domIsDark, setDomIsDark] = useState<boolean>(() => {
    const domDark = getDomIsDark();
    if (domDark) return true;
    const resolved = resolveTheme(theme);
    return resolved === "dark" && !enforcingLight;
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    // Detect from <html> on mount for immediate SSR/refresh correctness
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return domIsDark;
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
      setDomIsDark(false);
      applyDomTheme(false);
      return;
    }

    setThemeState(newTheme);
    const resolved = resolveTheme(newTheme);
    const isDarkResolved = resolved === "dark";

    // update immediately
    setIsDark(isDarkResolved);
    setDomIsDark(isDarkResolved);

    applyDomTheme(isDarkResolved);

    writeLocal(newTheme);
    void persistRemote(newTheme);
  };

  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  useLayoutEffect(() => {
    const root = document.documentElement;

    // If this route should be forced light: make sure dark is removed
    if (enforcingLight) {
      if (root.classList.contains("dark")) {
        root.classList.remove("dark");
      }
      if (isDark) {
        setIsDark(false);
      }
      if (domIsDark) {
        setDomIsDark(false);
      }
      return;
    }

    // Normal behaviour: resolve theme and sync .dark
    const resolved = resolveTheme(theme);
    const shouldBeDark = resolved === "dark";

    if (shouldBeDark !== isDark) {
      setIsDark(shouldBeDark);
    }

    if (shouldBeDark !== domIsDark) {
      setDomIsDark(shouldBeDark);
    }

    applyDomTheme(shouldBeDark);
  }, [theme, enforcingLight, isDark, domIsDark]);

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
      const shouldBeDark = resolved === "dark";
      setIsDark(shouldBeDark);
      setDomIsDark(shouldBeDark);
      applyDomTheme(shouldBeDark);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, enforcingLight]);

  // Keep local state in sync with the actual DOM class (single source of truth)
  useEffect(() => {
    const root = document.documentElement;
    const syncFromDom = () => {
      const hasDark = root.classList.contains("dark");
      setDomIsDark((prev) => (prev === hasDark ? prev : hasDark));
      setIsDark((prev) => (prev === hasDark ? prev : hasDark));
      root.style.setProperty("color-scheme", hasDark ? "dark" : "light");
    };

    syncFromDom();

    const observer = new MutationObserver(syncFromDom);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => observer.disconnect();
  }, []);

  // Load remote theme as soon as a user exists.
  // EVEN IF enforcingLight is active (e.g. login page).
  useEffect(() => {
    if (!user) return;

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

  const resolvedTheme = domIsDark ? "dark" : "light";

  const value: ThemeContextType = {
    theme,
    setTheme,
    isDark,
    resolvedTheme,
    isDarkResolved: domIsDark,
    toggleTheme,
    enforcingLight,
  };

  // When leaving enforced-light routes (login → dashboard)
  // immediately resolve system theme and apply correct DOM class
  useEffect(() => {
    if (!enforcingLight) {
      const resolved = resolveTheme(theme);
      const shouldBeDark = resolved === "dark";

      setIsDark(shouldBeDark);
      setDomIsDark(shouldBeDark);

      applyDomTheme(shouldBeDark);
    }
  }, [enforcingLight, theme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export default ThemeContext;
