import type { ComponentProps } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { Screen } from "@/components/ui/Screen";

type Props = ComponentProps<typeof Screen>;

/**
 * Screen wrapped in a KeyboardAvoidingView so form inputs are not
 * covered by the keyboard. Same props as Screen.
 */
export function KeyboardAwareScreen(props: Props) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={
        Platform.OS === "ios"
          ? "padding"
          : Platform.OS === "android"
            ? "height"
            : undefined
      }
    >
      <Screen {...props} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
