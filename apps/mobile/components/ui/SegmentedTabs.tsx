import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing } from "@/constants/theme";

const USE_NATIVE_DRIVER = Platform.OS !== "web";
const PADDING = 3;

export type Segment = {
  key: string;
  label: string;
};

type Props = {
  /** 2-4 segments. */
  segments: readonly Segment[];
  activeKey: string;
  onChange: (key: string) => void;
  style?: ViewStyle;
};

export function SegmentedTabs({ segments, activeKey, onChange, style }: Props) {
  const t = useTheme();
  const [innerWidth, setInnerWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const mountedRef = useRef(false);

  const count = Math.max(segments.length, 1);
  const segmentWidth = innerWidth / count;
  const rawIndex = segments.findIndex((s) => s.key === activeKey);
  const activeIndex = rawIndex === -1 ? 0 : rawIndex;

  useEffect(() => {
    if (innerWidth === 0) return;
    const target = activeIndex * segmentWidth;
    if (!mountedRef.current) {
      mountedRef.current = true;
      translateX.setValue(target);
      return;
    }
    Animated.timing(translateX, {
      toValue: target,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [activeIndex, segmentWidth, innerWidth, translateX]);

  const handleLayout = (e: LayoutChangeEvent) => {
    setInnerWidth(e.nativeEvent.layout.width - PADDING * 2);
  };

  return (
    <View
      onLayout={handleLayout}
      style={[styles.container, { backgroundColor: t.muted }, style]}
    >
      {innerWidth > 0 ? (
        <Animated.View
          style={[
            styles.pill,
            {
              width: segmentWidth,
              backgroundColor: t.background,
              borderColor: t.cardBorder,
              transform: [{ translateX }],
            },
          ]}
        />
      ) : null}
      {segments.map((segment) => {
        const isActive = segment.key === activeKey;
        return (
          <Pressable
            key={segment.key}
            onPress={() => onChange(segment.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={styles.segment}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.segmentLabel,
                { color: isActive ? t.text : t.mutedForeground },
                isActive && styles.segmentLabelActive,
              ]}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: radii.lg,
    padding: PADDING,
    height: 40,
  },
  pill: {
    position: "absolute",
    top: PADDING,
    left: PADDING,
    bottom: PADDING,
    borderRadius: radii.md + 1,
    borderWidth: 1,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  segmentLabelActive: {
    fontWeight: "600",
  },
});
