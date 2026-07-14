import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { icons } from "@/constants/icons";
import { radii, spacing } from "@/constants/theme";

type Props = Omit<TextInputProps, "value" | "onChangeText" | "style"> & {
  value: string;
  onChangeText: (text: string) => void;
  /** Delay before onChangeText fires. 0 (default) = immediate. */
  debounceMs?: number;
  style?: ViewStyle;
};

export function SearchInput({
  value,
  onChangeText,
  debounceMs = 0,
  style,
  ...rest
}: Props) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmittedRef = useRef(value);

  // Sync internal text when the value prop changes externally.
  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      lastEmittedRef.current = value;
      setText(value);
    }
  }, [value]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const emit = (next: string) => {
    lastEmittedRef.current = next;
    onChangeText(next);
  };

  const handleChange = (next: string) => {
    setText(next);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (debounceMs > 0) {
      timerRef.current = setTimeout(() => emit(next), debounceMs);
    } else {
      emit(next);
    }
  };

  const handleClear = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setText("");
    emit("");
  };

  return (
    <View
      style={[
        styles.row,
        {
          borderColor: focused ? t.primary : t.inputBorder,
          backgroundColor: t.inputBackground,
        },
        style,
      ]}
    >
      <Ionicons name={icons.search} size={18} color={t.textSecondary} />
      <TextInput
        value={text}
        onChangeText={handleChange}
        placeholderTextColor={t.placeholder}
        style={[styles.input, { color: t.text }]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        {...rest}
      />
      {text.length > 0 ? (
        <Pressable onPress={handleClear} hitSlop={8} accessibilityRole="button">
          <Ionicons name={icons.xCircle} size={18} color={t.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radii.lg,
    height: 44,
    paddingHorizontal: spacing.md + 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
});
