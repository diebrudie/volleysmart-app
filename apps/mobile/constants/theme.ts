/**
 * Design tokens for the VolleySmart mobile app.
 *
 * Mirrors the PWA design source (apps/web/src/index.css + tailwind.config.ts):
 * primary navy hsl(225 80% 33%) = #243F8D, secondary yellow #FBBF24,
 * success #4ADE80, danger #F87171, --radius 0.5rem = 8.
 *
 * Colors live in ./colors (palette + light/dark themes, consumed via useTheme()).
 */

import { Platform } from "react-native";
import type { TextStyle } from "react-native";

import { colors, palette } from "./colors";

export { colors, palette } from "./colors";
export type { ThemeColors } from "./colors";

/** 4px-based spacing scale. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export type SpacingKey = keyof typeof spacing;

/** Border radii. md (8) matches the web --radius: 0.5rem. */
export const radii = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 999,
} as const;

export type RadiusKey = keyof typeof radii;

/** Text styles. Spread into StyleSheet entries, e.g. { ...typography.h2, color: theme.text }. */
export const typography = {
  h1: { fontSize: 24, fontWeight: "700" },
  h2: { fontSize: 20, fontWeight: "700" },
  h3: { fontSize: 17, fontWeight: "600" },
  body: { fontSize: 15 },
  bodySm: { fontSize: 13 },
  caption: { fontSize: 12 },
  label: { fontSize: 12, fontWeight: "600" },
} as const satisfies Record<string, TextStyle>;

export type TypographyKey = keyof typeof typography;

/**
 * Backward-compatible export for leftover Expo-template files
 * (components/ui/collapsible.tsx, hooks/use-theme-color.ts).
 * New code should use useTheme() from @/hooks/useTheme instead.
 */
export const Colors = {
  light: {
    text: colors.light.text,
    background: colors.light.background,
    tint: colors.light.primary,
    icon: colors.light.icon,
    tabIconDefault: colors.light.tabInactive,
    tabIconSelected: colors.light.tabActive,
  },
  dark: {
    text: colors.dark.text,
    background: colors.dark.background,
    tint: palette.white,
    icon: colors.dark.icon,
    tabIconDefault: colors.dark.tabInactive,
    tabIconSelected: colors.dark.tabActive,
  },
} as const;

/** Backward-compatible font families from the Expo template. */
export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
