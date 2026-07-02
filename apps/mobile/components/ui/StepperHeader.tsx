import { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  /** 1-based current step. */
  step: number;
  totalSteps: number;
  title?: string;
  /** When provided, renders a back button on the left. */
  onBack?: () => void;
  style?: ViewStyle;
};

export function StepperHeader({ step, totalSteps, title, onBack, style }: Props) {
  const t = useTheme();
  const { t: tr } = useTranslation();
  const total = Math.max(1, totalSteps);
  const ratio = Math.min(1, Math.max(0, step / total));

  // Width animation is a layout prop: JS driver on all platforms.
  const progress = useRef(new Animated.Value(ratio)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: ratio,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [ratio, progress]);

  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.topRow}>
        <View style={styles.side}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              hitSlop={8}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.backButton,
                pressed && { backgroundColor: t.surface },
              ]}
            >
              <Ionicons name={icons.arrowLeft} size={22} color={t.text} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.center}>
          {title ? (
            <Text numberOfLines={1} style={[styles.title, { color: t.text }]}>
              {title}
            </Text>
          ) : null}
          <Text style={[styles.stepText, { color: t.mutedForeground }]}>
            {tr("common:stepOf", {
              defaultValue: "Step {{step}} of {{total}}",
              step: Math.min(step, total),
              total,
            })}
          </Text>
        </View>
        <View style={styles.side} />
      </View>

      <View style={[styles.track, { backgroundColor: t.muted }]}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: t.primary, width: fillWidth },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  side: {
    width: 40,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  title: {
    ...typography.h3,
  },
  stepText: {
    ...typography.caption,
    fontWeight: "600",
  },
  track: {
    height: 4,
    borderRadius: radii.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radii.full,
  },
});
