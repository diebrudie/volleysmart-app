/**
 * Theme picker — mobile counterpart of the PWA's ThemePicker
 * (apps/web/src/components/nav/ThemePicker.tsx): three stacked options,
 * active one filled, the rest outlined.
 */
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import {
  useThemeController,
  type ThemePreference,
} from "@/providers/ThemeProvider";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function ThemePickerSheet({ visible, onClose }: Props) {
  const { t } = useTranslation("common");
  const { preference, setPreference } = useThemeController();

  const options: Array<{ value: ThemePreference; label: string }> = [
    { value: "light", label: t("theme.light", { defaultValue: "Light" }) },
    { value: "dark", label: t("theme.dark", { defaultValue: "Dark" }) },
    { value: "system", label: t("theme.system", { defaultValue: "System" }) },
  ];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t("theme.title", { defaultValue: "Theme" })}
    >
      <View style={styles.options}>
        {options.map((o) => (
          <Button
            key={o.value}
            title={o.label}
            variant={preference === o.value ? "primary" : "outline"}
            onPress={() => setPreference(o.value)}
          />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: 12,
    paddingBottom: 8,
  },
});
