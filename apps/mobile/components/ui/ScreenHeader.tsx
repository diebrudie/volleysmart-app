/**
 * Detail-screen header — mirrors the PWA's page headers (e.g.
 * apps/web/src/pages/Notifications.tsx): 56px row with bottom border,
 * circular bordered back button with a plain arrow (no "Back" word),
 * centered title, optional right action.
 */
import { type ReactNode } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  title: string;
  /** Optional element rendered on the right edge (e.g. "Read all"). */
  right?: ReactNode;
  /** Overrides the default back behavior. */
  onBack?: () => void;
};

export function ScreenHeader({ title, right, onBack }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const goBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) {
      router.back();
    } else {
      // Deep link / fresh stack: land on the tabs instead of doing nothing
      router.replace("/(tabs)" as never);
    }
  };

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: theme.background,
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
      }}
    >
      <View style={styles.row}>
        <Pressable
          onPress={goBack}
          hitSlop={8}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.backButton,
            { borderColor: theme.border },
            pressed && { backgroundColor: theme.muted },
          ]}
        >
          <Ionicons name="arrow-back" size={16} color={theme.text} />
        </Pressable>
        <Text
          numberOfLines={1}
          style={[styles.title, { color: theme.text }]}
        >
          {title}
        </Text>
        {right ? <View style={styles.right}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  backButton: {
    position: "absolute",
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    maxWidth: "60%",
  },
  right: {
    position: "absolute",
    right: 16,
  },
});
