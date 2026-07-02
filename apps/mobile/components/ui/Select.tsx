import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { icons, type IoniconsName } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

/**
 * Shared pressable form-field trigger (label + value + right icon)
 * used by Select, DateField and TimeField.
 */
export function PickerField({
  label,
  valueText,
  placeholder,
  icon = icons.chevronDown,
  error,
  disabled = false,
  onPress,
}: {
  label?: string;
  valueText: string | null;
  placeholder?: string;
  icon?: IoniconsName;
  error?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  const hasValue = valueText !== null && valueText !== "";

  return (
    <View style={fieldStyles.wrapper}>
      {label ? (
        <Text style={[fieldStyles.label, { color: t.textSecondary }]}>
          {label}
        </Text>
      ) : null}
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        style={({ pressed }) => [
          fieldStyles.field,
          {
            borderColor: error ? t.danger : t.inputBorder,
            backgroundColor: pressed ? t.surface : t.inputBackground,
          },
          disabled && fieldStyles.disabled,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            fieldStyles.valueText,
            { color: hasValue ? t.text : t.placeholder },
          ]}
        >
          {hasValue ? valueText : placeholder ?? ""}
        </Text>
        <Ionicons name={icon} size={18} color={t.textSecondary} />
      </Pressable>
      {error ? (
        <Text style={[fieldStyles.error, { color: t.danger }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: { gap: 4 },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 2 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radii.lg,
    height: 48,
    paddingHorizontal: 14,
    gap: spacing.sm,
  },
  valueText: { flex: 1, fontSize: 16 },
  error: { fontSize: 13, marginTop: 2 },
  disabled: { opacity: 0.5 },
});

export type SelectOption<V extends string | number> = {
  label: string;
  value: V;
};

type BaseProps<V extends string | number> = {
  label?: string;
  placeholder?: string;
  options: readonly SelectOption<V>[];
  /** Title shown on the options sheet. Falls back to `label`. */
  sheetTitle?: string;
  error?: string;
  disabled?: boolean;
};

type SingleSelectProps<V extends string | number> = BaseProps<V> & {
  multiple?: false;
  value: V | null;
  onChange: (value: V) => void;
};

type MultiSelectProps<V extends string | number> = BaseProps<V> & {
  multiple: true;
  value: readonly V[];
  onChange: (value: V[]) => void;
};

export type SelectProps<V extends string | number> =
  | SingleSelectProps<V>
  | MultiSelectProps<V>;

export function Select<V extends string | number>(props: SelectProps<V>) {
  const {
    label,
    placeholder,
    options,
    sheetTitle,
    error,
    disabled = false,
  } = props;
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [open, setOpen] = useState(false);

  const isSelected = (value: V): boolean =>
    props.multiple === true
      ? props.value.includes(value)
      : props.value === value;

  const selectedLabels = options
    .filter((o) => isSelected(o.value))
    .map((o) => o.label);
  const valueText = selectedLabels.length > 0 ? selectedLabels.join(", ") : null;

  const handleOptionPress = (value: V) => {
    if (props.multiple === true) {
      const next = props.value.includes(value)
        ? props.value.filter((v) => v !== value)
        : [...props.value, value];
      props.onChange(next);
    } else {
      props.onChange(value);
      setOpen(false);
    }
  };

  return (
    <>
      <PickerField
        label={label}
        valueText={valueText}
        placeholder={placeholder}
        error={error}
        disabled={disabled}
        onPress={() => setOpen(true)}
      />
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={sheetTitle ?? label}
      >
        <View style={styles.list}>
          {options.map((option) => {
            const selected = isSelected(option.value);
            return (
              <Pressable
                key={String(option.value)}
                onPress={() => handleOptionPress(option.value)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.option,
                  { backgroundColor: pressed ? t.surface : "transparent" },
                  selected && { backgroundColor: t.muted },
                ]}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    { color: t.text },
                    selected && styles.optionLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {selected ? (
                  <Ionicons name={icons.check} size={20} color={t.primary} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
        {props.multiple === true ? (
          <Button
            title={tr("common:done", { defaultValue: "Done" })}
            onPress={() => setOpen(false)}
            style={styles.doneButton}
          />
        ) : null}
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  list: { gap: 2, paddingBottom: spacing.sm },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  optionLabel: {
    ...typography.body,
    flex: 1,
  },
  optionLabelSelected: {
    fontWeight: "600",
  },
  doneButton: { marginTop: spacing.sm },
});
