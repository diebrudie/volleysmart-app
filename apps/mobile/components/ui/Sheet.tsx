import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { radii, spacing, typography } from "@/constants/theme";

const USE_NATIVE_DRIVER = Platform.OS !== "web";

type Props = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  title?: string;
  /**
   * When true (default) the sheet is as tall as its content
   * (capped at maxHeightRatio). When false it always takes
   * maxHeightRatio of the window height.
   */
  snapToContent?: boolean;
  /** Max sheet height as a fraction of the window height. Default 0.85. */
  maxHeightRatio?: number;
}>;

export function Sheet({
  visible,
  onClose,
  title,
  snapToContent = true,
  maxHeightRatio = 0.85,
  children,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      dragY.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, progress, dragY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_evt, gesture) =>
          gesture.dy > 4 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_evt, gesture) => {
          if (gesture.dy > 0) dragY.setValue(gesture.dy);
        },
        onPanResponderRelease: (_evt, gesture) => {
          if (gesture.dy > 90 || gesture.vy > 1.2) {
            onCloseRef.current();
          } else {
            Animated.spring(dragY, {
              toValue: 0,
              useNativeDriver: USE_NATIVE_DRIVER,
            }).start();
          }
        },
      }),
    [dragY],
  );

  const handleBackdropPress = useCallback(() => {
    onCloseRef.current();
  }, []);

  const translateY = Animated.add(
    progress.interpolate({
      inputRange: [0, 1],
      outputRange: [windowHeight, 0],
    }),
    dragY,
  );

  const maxHeight = Math.round(windowHeight * maxHeightRatio);

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: t.overlay, opacity: progress },
          ]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleBackdropPress}
            accessibilityRole="button"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: t.card,
              paddingBottom: insets.bottom + spacing.lg,
              transform: [{ translateY }],
            },
            snapToContent ? { maxHeight } : { height: maxHeight },
          ]}
        >
          <View style={styles.handleArea} {...panResponder.panHandlers}>
            <View style={[styles.handle, { backgroundColor: t.border }]} />
          </View>

          {title ? (
            <Text style={[styles.title, { color: t.text }]}>{title}</Text>
          ) : null}

          <ScrollView
            style={snapToContent ? undefined : styles.grow}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    width: "100%",
  },
  handleArea: {
    alignItems: "center",
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: radii.full,
  },
  title: {
    ...typography.h3,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  grow: { flexGrow: 1 },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
});
