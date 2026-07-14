import { useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useTheme } from "@/hooks/useTheme";
import { icons } from "@/constants/icons";
import { useFaqs } from "@/hooks/useFaqs";
import type { Faq } from "@volleysmart/core";

// Enable LayoutAnimation on Android.
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function FaqScreen() {
  const { t } = useTranslation("common");
  const theme = useTheme();
  const { data: faqs, isLoading, isError } = useFaqs();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group by category, preserving the category/sort_order order from the query.
  const faqsByCategory = useMemo(() => {
    const grouped = new Map<string, Faq[]>();
    (faqs ?? []).forEach((faq) => {
      const existing = grouped.get(faq.category) ?? [];
      grouped.set(faq.category, [...existing, faq]);
    });
    return Array.from(grouped.entries());
  }, [faqs]);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((current) => (current === id ? null : id));
  };

  const title = t("faqs.title", { defaultValue: "FAQ" });

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title={title} />

      {isLoading ? (
        <Screen scroll={false} safeTop={false}>
          <Spinner />
        </Screen>
      ) : isError ? (
        <Screen scroll={false} safeTop={false}>
          <View style={styles.center}>
            <EmptyState
              title={title}
              subtitle={t("faqs.loadError", {
                defaultValue:
                  "We could not load the FAQs right now. Please try again later.",
              })}
            />
          </View>
        </Screen>
      ) : faqsByCategory.length === 0 ? (
        <Screen scroll={false} safeTop={false}>
          <View style={styles.center}>
            <EmptyState
              title={title}
              subtitle={t("faqs.noResults", {
                defaultValue: "No FAQs match your search.",
              })}
            />
          </View>
        </Screen>
      ) : (
        <Screen safeTop={false} contentStyle={styles.content}>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t("faqs.subtitle", {
              defaultValue:
                "Browse all frequently asked questions about VolleySmart.",
            })}
          </Text>

          {faqsByCategory.map(([category, categoryFaqs]) => (
            <View key={category} style={styles.section}>
              <Text style={[styles.category, { color: theme.primary }]}>
                {category}
              </Text>
              <View
                style={[styles.group, { borderTopColor: theme.border }]}
              >
                {categoryFaqs.map((faq) => {
                  const open = expandedId === faq.id;
                  return (
                    <View
                      key={faq.id}
                      style={[
                        styles.item,
                        { borderBottomColor: theme.border },
                      ]}
                    >
                      <Pressable
                        onPress={() => toggle(faq.id)}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                          styles.trigger,
                          pressed && { backgroundColor: theme.muted },
                        ]}
                      >
                        <Text
                          style={[styles.question, { color: theme.text }]}
                        >
                          {faq.question}
                        </Text>
                        <Ionicons
                          name={open ? icons.chevronUp : icons.chevronDown}
                          size={18}
                          color={theme.textSecondary}
                        />
                      </Pressable>
                      {open ? (
                        <View style={styles.answerWrap}>
                          <Text
                            style={[
                              styles.answer,
                              { color: theme.textSecondary },
                            ]}
                          >
                            {faq.answer}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </Screen>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center" },
  content: { paddingTop: 16 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  section: { marginBottom: 24 },
  category: { fontSize: 15, fontWeight: "600", marginBottom: 8 },
  group: { borderTopWidth: 1 },
  item: { borderBottomWidth: 1 },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
  },
  question: { flex: 1, fontSize: 14, fontWeight: "500" },
  answerWrap: { paddingBottom: 14 },
  answer: { fontSize: 14, lineHeight: 21 },
});
