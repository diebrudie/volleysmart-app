import { type PropsWithChildren, useCallback, useState } from "react";
import {
  ScrollView,
  RefreshControl,
  View,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";

type Props = PropsWithChildren<{
  scroll?: boolean;
  onRefresh?: () => Promise<void>;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  padded?: boolean;
  safeTop?: boolean;
}>;

export function Screen({
  children,
  scroll = true,
  onRefresh,
  style,
  contentStyle,
  padded = true,
  safeTop = true,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  const padding = padded ? 16 : 0;

  const topPad = safeTop ? insets.top : 0;

  if (!scroll) {
    return (
      <View
        style={[
          styles.base,
          {
            backgroundColor: t.background,
            paddingTop: topPad,
            paddingBottom: insets.bottom,
            paddingHorizontal: padding,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.base, { backgroundColor: t.background }, style]}
      contentContainerStyle={[
        {
          paddingTop: topPad,
          paddingBottom: insets.bottom + 20,
          paddingHorizontal: padding,
        },
        contentStyle,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={t.primary}
          />
        ) : undefined
      }
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1 },
});
