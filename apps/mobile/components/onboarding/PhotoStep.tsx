import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { Avatar } from "@/components/ui/Avatar";
import { StepShell } from "@/components/onboarding/StepShell";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  photoUrl: string | null;
  uploading: boolean;
  onPick: () => void;
  onRemove: () => void;
};

export function PhotoStep({ photoUrl, uploading, onPick, onRemove }: Props) {
  const { t } = useTranslation("onboarding");
  const theme = useTheme();

  return (
    <StepShell
      title={t("photo.title", { defaultValue: "Upload a profile picture" })}
      subtitle={t("photo.subtitle", {
        defaultValue: "Add a photo so your teammates can recognize you!",
      })}
    >
      <View style={styles.content}>
        {photoUrl ? (
          <Avatar uri={photoUrl} size={128} />
        ) : (
          <View
            style={[
              styles.placeholder,
              { backgroundColor: theme.muted, borderColor: theme.cardBorder },
            ]}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons
                name={icons.camera}
                size={40}
                color={theme.mutedForeground}
              />
            )}
          </View>
        )}

        <Pressable
          onPress={onPick}
          disabled={uploading}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.uploadButton,
            { borderColor: theme.inputBorder, backgroundColor: theme.card },
            pressed && { backgroundColor: theme.muted },
            uploading && styles.disabled,
          ]}
        >
          <Ionicons
            name={icons.upload}
            size={20}
            color={theme.mutedForeground}
          />
          <Text style={[styles.uploadText, { color: theme.text }]}>
            {photoUrl
              ? t("photo.change", { defaultValue: "Change Photo" })
              : t("photo.upload", { defaultValue: "Upload Photo" })}
          </Text>
        </Pressable>

        {photoUrl ? (
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            hitSlop={8}
            style={styles.removeButton}
          >
            <Ionicons name={icons.x} size={16} color={theme.danger} />
            <Text style={[styles.removeText, { color: theme.danger }]}>
              {t("photo.remove", { defaultValue: "Remove" })}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </StepShell>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    gap: spacing.xl,
  },
  placeholder: {
    width: 128,
    height: 128,
    borderRadius: radii.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 2,
    borderStyle: "dashed",
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  uploadText: {
    ...typography.body,
    fontWeight: "500",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  removeText: {
    ...typography.bodySm,
    fontWeight: "500",
  },
  disabled: {
    opacity: 0.5,
  },
});
