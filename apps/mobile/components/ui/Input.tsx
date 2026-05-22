import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  type TextInputProps,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  rightIcon?: React.ReactNode;
};

export function Input({ label, error, rightIcon, style, ...rest }: Props) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? t.danger
    : focused
    ? t.primary
    : t.inputBorder;

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: t.textSecondary }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputRow,
          {
            borderColor,
            backgroundColor: t.inputBackground,
          },
        ]}
      >
        <TextInput
          placeholderTextColor={t.placeholder}
          style={[styles.input, { color: t.text }, style]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {rightIcon && (
          <Pressable style={styles.iconWrap}>{rightIcon}</Pressable>
        )}
      </View>
      {error && <Text style={[styles.error, { color: t.danger }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 2 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontSize: 16, height: "100%" },
  iconWrap: { marginLeft: 8 },
  error: { fontSize: 13, marginTop: 2 },
});
