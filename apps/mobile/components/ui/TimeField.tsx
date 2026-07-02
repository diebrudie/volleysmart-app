import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { PickerField } from "@/components/ui/Select";
import { palette } from "@/constants/colors";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  label?: string;
  /** "HH:mm" (24h) or null when unset. */
  value: string | null;
  onChange: (value: string) => void;
  /** Minute column step. Default 15. */
  minuteStep?: number;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
};

const pad2 = (n: number) => String(n).padStart(2, "0");

function parseTime(value: string | null): { hour: number; minute: number } | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function TimeField({
  label,
  value,
  onChange,
  minuteStep = 15,
  placeholder,
  error,
  disabled = false,
}: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const [open, setOpen] = useState(false);

  const parsed = parseTime(value);
  const [pendingHour, setPendingHour] = useState(parsed?.hour ?? 18);
  const [pendingMinute, setPendingMinute] = useState(parsed?.minute ?? 0);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const step = Math.max(1, Math.min(30, minuteStep));
  const minutes = Array.from(
    { length: Math.ceil(60 / step) },
    (_, i) => i * step,
  );

  const openSheet = () => {
    const current = parseTime(value);
    setPendingHour(current?.hour ?? 18);
    setPendingMinute(current?.minute ?? 0);
    setOpen(true);
  };

  const confirm = () => {
    onChange(`${pad2(pendingHour)}:${pad2(pendingMinute)}`);
    setOpen(false);
  };

  const renderColumn = (
    items: number[],
    selected: number,
    onSelect: (n: number) => void,
  ) => (
    <ScrollView
      style={styles.column}
      contentContainerStyle={styles.columnContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      {items.map((item) => {
        const isSelected = item === selected;
        return (
          <Pressable
            key={item}
            onPress={() => onSelect(item)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.item,
              isSelected && { backgroundColor: t.primary },
              pressed && !isSelected && { backgroundColor: t.surface },
            ]}
          >
            <Text
              style={[
                styles.itemText,
                { color: isSelected ? palette.white : t.text },
                isSelected && styles.itemTextSelected,
              ]}
            >
              {pad2(item)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <>
      <PickerField
        label={label}
        valueText={value}
        placeholder={placeholder}
        icon={icons.clock}
        error={error}
        disabled={disabled}
        onPress={openSheet}
      />
      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        snapToContent
      >
        <View style={styles.pickerRow}>
          {renderColumn(hours, pendingHour, setPendingHour)}
          <Text style={[styles.separator, { color: t.text }]}>:</Text>
          {renderColumn(minutes, pendingMinute, setPendingMinute)}
        </View>
        <Button
          title={tr("common:done", { defaultValue: "Done" })}
          onPress={confirm}
          style={styles.doneButton}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  pickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 240,
    gap: spacing.sm,
  },
  column: {
    width: 84,
    flexGrow: 0,
  },
  columnContent: {
    gap: 2,
    paddingVertical: spacing.sm,
  },
  item: {
    height: 42,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 18,
  },
  itemTextSelected: {
    fontWeight: "700",
  },
  separator: {
    ...typography.h2,
    marginHorizontal: spacing.xs,
  },
  doneButton: { marginTop: spacing.md },
});
