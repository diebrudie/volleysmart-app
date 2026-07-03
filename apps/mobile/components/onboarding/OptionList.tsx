import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { palette } from "@/constants/colors";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

export type OptionItem = { value: string; label: string };

type Props = {
  options: OptionItem[];
  /** Selected value (single mode) or values (multi mode). */
  selected: string | string[];
  /** Called with the tapped option's value (toggle it yourself in multi mode). */
  onSelect: (value: string) => void;
  multi?: boolean;
};

/**
 * Bordered option cards matching the PWA onboarding radio/checkbox cards
 * (border-2, selected = primary border + tinted background).
 */
export function OptionList({ options, selected, onSelect, multi = false }: Props) {
  const t = useTheme();

  const isSelected = (value: string) =>
    Array.isArray(selected) ? selected.includes(value) : selected === value;

  return (
    <View style={styles.list}>
      {options.map((option) => {
        const active = isSelected(option.value);
        return (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            accessibilityRole={multi ? "checkbox" : "radio"}
            accessibilityState={{ selected: active, checked: active }}
            style={({ pressed }) => [
              styles.card,
              {
                borderColor: active ? t.primary : t.cardBorder,
                backgroundColor: active ? t.muted : t.card,
              },
              pressed && { backgroundColor: t.muted },
            ]}
          >
            <View
              style={[
                multi ? styles.box : styles.circle,
                {
                  borderColor: active ? t.primary : t.inputBorder,
                  backgroundColor: active ? t.primary : t.inputBackground,
                },
              ]}
            >
              {active ? (
                <Ionicons name={icons.check} size={14} color={palette.white} />
              ) : null}
            </View>
            <Text style={[styles.label, { color: t.text }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  circle: {
    width: 22,
    height: 22,
    borderRadius: radii.full,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...typography.body,
    fontWeight: "500",
    flex: 1,
  },
});
