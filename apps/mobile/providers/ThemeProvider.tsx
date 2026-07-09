/**
 * Theme preference provider — mirrors the PWA's ThemeContext
 * (apps/web/src/contexts/ThemeContext.tsx): preference is light | dark |
 * system, persisted locally and in user_profiles.theme (null = system,
 * missing/invalid = light), so the choice follows the user across devices.
 * ForceLight pins a subtree (auth, onboarding) to light mode, matching the
 * PWA's enforced-light routes.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSupabaseClient } from "@volleysmart/core";
import { useAuth } from "@/hooks/useAuth";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "volleysmart-theme";

type ThemeContextValue = {
  preference: ThemePreference;
  setPreference: (p: ThemePreference) => void;
  resolved: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const ForceLightContext = createContext(false);

function isPreference(v: unknown): v is ThemePreference {
  return v === "light" || v === "dark" || v === "system";
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const { user } = useAuth();
  const [preference, setPreferenceState] = useState<ThemePreference>("light");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (isPreference(saved)) setPreferenceState(saved);
      })
      .catch(() => {});
  }, []);

  // Remote theme wins once the user is known (PWA parity: null/invalid -> light)
  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    (async () => {
      const { data, error } = await getSupabaseClient()
        .from("user_profiles")
        .select("theme")
        .eq("id", user.id)
        .single();
      if (!mounted || error) return;
      const remote: ThemePreference = isPreference(data?.theme)
        ? (data.theme as ThemePreference)
        : "light";
      setPreferenceState(remote);
      AsyncStorage.setItem(STORAGE_KEY, remote).catch(() => {});
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const resolved: "light" | "dark" =
    preference === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved,
      setPreference: (p: ThemePreference) => {
        setPreferenceState(p);
        AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
        if (user?.id) {
          getSupabaseClient()
            .from("user_profiles")
            .update({
              theme: p === "system" ? null : p,
              theme_updated_at: new Date().toISOString(),
            })
            .eq("id", user.id)
            .then(({ error }) => {
              if (error) console.error("Theme persistence failed:", error);
            });
        }
      },
    }),
    [preference, resolved, user?.id]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/** Pins the subtree to light mode (auth screens, onboarding). */
export function ForceLight({ children }: PropsWithChildren) {
  return (
    <ForceLightContext.Provider value={true}>
      <StatusBar style="dark" />
      {children}
    </ForceLightContext.Provider>
  );
}

/** Preference + setter, for the theme picker UI. */
export function useThemeController(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeController must be used within ThemeProvider");
  }
  return ctx;
}

/** The scheme the UI should render with (honors ForceLight). */
export function useResolvedScheme(): "light" | "dark" {
  const forced = useContext(ForceLightContext);
  const ctx = useContext(ThemeContext);
  const system = useColorScheme();
  if (forced) return "light";
  if (ctx) return ctx.resolved;
  return system === "dark" ? "dark" : "light";
}
