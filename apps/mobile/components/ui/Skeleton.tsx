import { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  View,
  type DimensionValue,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing } from "@/constants/theme";

const USE_NATIVE_DRIVER = Platform.OS !== "web";

type Props = {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

export function Skeleton({
  width = "100%",
  height = 16,
  radius = radii.md,
  style,
}: Props) {
  const t = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: t.muted,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Convenience list-row placeholder: optional avatar circle + text lines. */
export function SkeletonRow({
  avatar = false,
  lines = 2,
  style,
}: {
  avatar?: boolean;
  lines?: number;
  style?: ViewStyle;
}) {
  return (
    <View style={[styles.row, style]}>
      {avatar ? <Skeleton width={44} height={44} radius={radii.full} /> : null}
      <View style={styles.lines}>
        {Array.from({ length: Math.max(1, lines) }, (_, i) => (
          <Skeleton
            key={i}
            height={i === 0 ? 16 : 12}
            width={i === 0 ? "70%" : "45%"}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  lines: {
    flex: 1,
    gap: spacing.sm,
  },
});
