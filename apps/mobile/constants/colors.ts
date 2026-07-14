export const palette = {
  navy: "#243F8D",
  navyDark: "#1a365d",
  green600: "#16a34a",
  green700: "#15803d",
  red600: "#dc2626",
  red700: "#b91c1c",
  blue600: "#2563eb",
  blue700: "#1d4ed8",
  amber500: "#f59e0b",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",
  white: "#ffffff",
  black: "#000000",
  // PWA parity tokens (apps/web/src/index.css + tailwind.config.ts)
  yellow400: "#FBBF24", // --secondary hsl(42 96% 56%) / volleyball.secondary
  green400: "#4ADE80", // volleyball.success
  red400: "#F87171", // volleyball.danger
  red500: "#EF4444", // --destructive hsl(0 84.2% 60.2%)
  red900: "#7F1D1D", // dark --destructive hsl(0 62.8% 30.6%)
  slate100: "#F1F5F9", // --muted hsl(210 40% 96.1%)
  slate200: "#E2E8F0", // --border hsl(214.3 31.8% 91.4%)
  slate400: "#94A3B8", // dark --muted-foreground hsl(215 20.2% 65.1%)
  slate500: "#64748B", // --muted-foreground hsl(215.4 16.3% 46.9%)
  slate800: "#1E293B", // dark --muted / --border hsl(217.2 32.6% 17.5%)
  slate900: "#0F172A", // --secondary-foreground hsl(222.2 47.4% 11.2%)
  slate50: "#F8FAFC", // dark --foreground hsl(210 40% 98%)
  slate700: "#334155",
  slate950: "#020817", // dark --background hsl(222.2 84% 4.9%)
  blueBright: "#3661E2", // dark --primary hsl(225 75% 55%) "Mikasa blue — brighter for dark mode contrast"
} as const;

export const colors = {
  light: {
    text: palette.gray900,
    textSecondary: palette.gray500,
    background: palette.white,
    surface: palette.gray50,
    border: palette.gray200,
    primary: palette.navy,
    primaryPressed: palette.navyDark,
    danger: palette.red600,
    dangerPressed: palette.red700,
    accent: palette.blue600,
    accentPressed: palette.blue700,
    icon: palette.gray500,
    tabActive: palette.navy,
    tabInactive: palette.gray400,
    inputBorder: palette.gray300,
    inputBackground: palette.white,
    placeholder: palette.gray400,
    // PWA parity tokens
    secondary: palette.yellow400,
    secondaryForeground: palette.slate900,
    success: palette.green400,
    warning: palette.yellow400,
    muted: palette.slate100,
    mutedForeground: palette.slate500,
    card: palette.white,
    cardBorder: palette.slate200,
    overlay: "rgba(0, 0, 0, 0.5)",
    destructive: palette.red500,
  },
  // Dark values mirror apps/web/src/index.css `.dark` exactly (slate hues, not gray)
  dark: {
    text: palette.slate50,
    textSecondary: palette.slate400,
    background: palette.slate950,
    surface: palette.slate800,
    border: palette.slate800,
    primary: palette.blueBright,
    primaryPressed: palette.blue700,
    danger: palette.red600,
    dangerPressed: palette.red700,
    accent: palette.blue600,
    accentPressed: palette.blue700,
    icon: palette.slate400,
    tabActive: palette.blueBright,
    tabInactive: palette.slate500,
    inputBorder: palette.slate700,
    inputBackground: palette.slate800,
    placeholder: palette.slate500,
    // PWA parity tokens
    secondary: palette.yellow400,
    secondaryForeground: palette.slate900,
    success: palette.green400,
    warning: palette.yellow400,
    muted: palette.slate800,
    mutedForeground: palette.slate400,
    card: palette.slate950,
    cardBorder: palette.slate800,
    overlay: "rgba(0, 0, 0, 0.6)",
    destructive: palette.red400,
  },
} as const;

export type ThemeColors = typeof colors.light;
