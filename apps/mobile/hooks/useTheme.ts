import { colors } from "@/constants/colors";
import { useResolvedScheme } from "@/providers/ThemeProvider";

export function useTheme() {
  return colors[useResolvedScheme()];
}
