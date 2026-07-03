import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { EventTemplate } from "@volleysmart/core";
import { Sheet } from "@/components/ui/Sheet";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/Toast";
import {
  useDeleteEventTemplate,
  useEventTemplates,
} from "@/hooks/useEventTemplates";
import { useTheme } from "@/hooks/useTheme";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called with the picked template; the caller applies its config and closes. */
  onApply: (template: EventTemplate) => void;
};

/**
 * Bottom sheet listing the user's saved event templates
 * (mirrors the web CreateEvent templates drawer): tap to apply,
 * trash to delete.
 */
export function TemplatePicker({ visible, onClose, onApply }: Props) {
  const { t } = useTranslation("events");
  const theme = useTheme();
  const { data: templates = [], isLoading } = useEventTemplates();
  const deleteTemplate = useDeleteEventTemplate();

  const handleDelete = (templateId: string) => {
    deleteTemplate.mutate(templateId, {
      onSuccess: () =>
        toast(t("create.templateDeleted", { defaultValue: "Template deleted" })),
      onError: () =>
        toast(
          t("create.templateDeleteFailed", {
            defaultValue: "Failed to delete template",
          }),
          "error"
        ),
    });
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t("create.templates", { defaultValue: "Templates" })}
    >
      {isLoading ? (
        <View style={styles.loading}>
          <Spinner />
        </View>
      ) : templates.length === 0 ? (
        <Text style={[styles.empty, { color: theme.mutedForeground }]}>
          {t("create.noTemplates", {
            defaultValue:
              "No templates yet. Create an event and save it as a template.",
          })}
        </Text>
      ) : (
        <View style={styles.list}>
          {templates.map((tpl) => (
            <View
              key={tpl.id}
              style={[styles.row, { borderBottomColor: theme.border }]}
            >
              <Pressable
                onPress={() => onApply(tpl)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.applyArea,
                  pressed && { backgroundColor: theme.surface },
                ]}
              >
                <Ionicons
                  name={icons.fileText}
                  size={18}
                  color={theme.textSecondary}
                />
                <Text
                  numberOfLines={1}
                  style={[styles.name, { color: theme.text }]}
                >
                  {tpl.name}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => handleDelete(tpl.id)}
                disabled={deleteTemplate.isPending}
                accessibilityRole="button"
                hitSlop={6}
                style={({ pressed }) => [
                  styles.deleteButton,
                  pressed && { backgroundColor: theme.surface },
                ]}
              >
                <Ionicons
                  name={icons.trash2}
                  size={18}
                  color={theme.destructive}
                />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: spacing.xxl, alignItems: "center" },
  empty: {
    ...typography.bodySm,
    textAlign: "center",
    paddingVertical: spacing.xxl,
  },
  list: { paddingBottom: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  applyArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.md,
  },
  name: { ...typography.body, fontWeight: "500", flex: 1 },
  deleteButton: {
    padding: spacing.sm,
    borderRadius: radii.md,
  },
});
