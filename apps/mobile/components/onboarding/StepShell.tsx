import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { spacing, typography } from "@/constants/theme";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  /** Center-align the header (used by the welcome step). */
  centered?: boolean;
  /** Optional element rendered at the end of the title row (e.g. a help icon). */
  titleAccessory?: ReactNode;
}>;

/** Shared header + content wrapper for one onboarding step. */
export function StepShell({
  title,
  subtitle,
  centered = false,
  titleAccessory,
  children,
}: Props) {
  const t = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.header, centered && styles.headerCentered]}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              styles.titleFlex,
              { color: t.text },
              centered && styles.textCentered,
            ]}
          >
            {title}
          </Text>
          {titleAccessory ? (
            <View style={styles.accessory}>{titleAccessory}</View>
          ) : null}
        </View>
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
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  titleFlex: {
    flex: 1,
  },
  accessory: {
    paddingTop: spacing.xs,
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
