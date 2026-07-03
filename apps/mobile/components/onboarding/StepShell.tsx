import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { spacing, typography } from "@/constants/theme";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  /** Center-align the header (used by the welcome step). */
  centered?: boolean;
}>;

/** Shared header + content wrapper for one onboarding step. */
export function StepShell({ title, subtitle, centered = false, children }: Props) {
  const t = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.header, centered && styles.headerCentered]}>
        <Text
          style={[
            styles.title,
            { color: t.text },
            centered && styles.textCentered,
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              { color: t.mutedForeground },
              centered && styles.textCentered,
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  headerCentered: {
    alignItems: "center",
  },
  title: {
    ...typography.h1,
  },
  subtitle: {
    ...typography.body,
    lineHeight: 22,
  },
  textCentered: {
    textAlign: "center",
  },
});
