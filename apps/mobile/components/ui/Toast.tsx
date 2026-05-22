import { useEffect, useRef, useCallback, useState } from "react";
import { Text, StyleSheet, Animated, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "success" | "error" | "info";

type ToastData = {
  message: string;
  type?: ToastType;
  duration?: number;
};

let showFn: ((data: ToastData) => void) | null = null;

export function toast(message: string, type: ToastType = "success") {
  showFn?.({ message, type });
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const messageRef = useRef("");
  const typeRef = useRef<ToastType>("success");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setTick] = useState(0);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -100, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [translateY, opacity]);

  const show = useCallback(
    ({ message, type = "success", duration = 3000 }: ToastData) => {
      messageRef.current = message;
      typeRef.current = type;
      setTick((n) => n + 1);
      if (timerRef.current) clearTimeout(timerRef.current);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 15 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      timerRef.current = setTimeout(hide, duration);
    },
    [translateY, opacity, hide]
  );

  useEffect(() => {
    showFn = show;
    return () => { showFn = null; };
  }, [show]);

  const bg =
    typeRef.current === "error" ? "#dc2626" : typeRef.current === "info" ? "#2563eb" : "#16a34a";

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.host,
        { top: insets.top + 8, transform: [{ translateY }], opacity },
      ]}
    >
      <Pressable onPress={hide} style={[styles.toast, { backgroundColor: bg }]}>
        <Text style={styles.text}>{messageRef.current}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: "center",
  },
  toast: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  text: { color: "#fff", fontSize: 15, fontWeight: "600", textAlign: "center" },
});
