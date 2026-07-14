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

  // Multiline fields need to grow: the single-line row is a fixed 48px tall
  // with centered content, which clips a tall TextInput and pushes its
  // placeholder up over the label. For multiline we drop the fixed height,
  // top-align, and add vertical padding so the field reads as a proper box.
  const isMultiline = !!rest.multiline;

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: t.textSecondary }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputRow,
          isMultiline ? styles.inputRowMultiline : styles.inputRowSingle,
          {
            borderColor,
            backgroundColor: t.inputBackground,
          },
        ]}
      >
        <TextInput
          placeholderTextColor={t.placeholder}
          textAlignVertical={isMultiline ? "top" : undefined}
          style={[
            styles.input,
            isMultiline ? styles.inputMultiline : styles.inputSingle,
            { color: t.text },
            style,
          ]}
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
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputRowSingle: { alignItems: "center", height: 48 },
  inputRowMultiline: {
    alignItems: "flex-start",
    minHeight: 96,
    paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 16 },
  inputSingle: { height: "100%" },
  inputMultiline: { minHeight: 76 },
  iconWrap: { marginLeft: 8 },
  error: { fontSize: 13, marginTop: 2 },
});
