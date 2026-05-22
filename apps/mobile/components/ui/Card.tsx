import { View, StyleSheet, type ViewStyle, type ViewProps } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type Props = ViewProps & {
  style?: ViewStyle;
};

export function Card({ style, children, ...rest }: Props) {
  const t = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: t.surface, borderColor: t.border },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
});
