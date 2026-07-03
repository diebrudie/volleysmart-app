import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { Input } from "@/components/ui/Input";
import { radii, spacing, typography } from "@/constants/theme";

type Props = {
  firstName: string;
  lastName: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  /** When true, both names came from auth metadata and inputs are hidden. */
  namesAutoFilled: boolean;
};

export function WelcomeStep({
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
  namesAutoFilled,
}: Props) {
  const { t } = useTranslation("onboarding");
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>
          🏐{" "}
          {t("welcome.title", {
            defaultValue: "Let's Complete Your Player Profile",
          })}
        </Text>
        <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
          {t("welcome.subtitle", {
            defaultValue:
              "Help us get to know your volleyball style so we can match you with the right team!",
          })}
        </Text>
      </View>

      {!namesAutoFilled && (
        <View
          style={[
            styles.nameCard,
            { backgroundColor: theme.muted, borderColor: theme.cardBorder },
          ]}
        >
          <Text style={[styles.namePrompt, { color: theme.text }]}>
            {t("welcome.namePrompt", {
              defaultValue: "First, tell us your name:",
            })}
          </Text>
          <Input
            label={t("welcome.firstName", { defaultValue: "First name" })}
            placeholder={t("welcome.firstNamePlaceholder", {
              defaultValue: "Jane",
            })}
            value={firstName}
            onChangeText={onFirstNameChange}
            autoComplete="given-name"
            autoCapitalize="words"
          />
          <Input
            label={t("welcome.lastName", { defaultValue: "Last name" })}
            placeholder={t("welcome.lastNamePlaceholder", {
              defaultValue: "Doe",
            })}
            value={lastName}
            onChangeText={onLastNameChange}
            autoComplete="family-name"
            autoCapitalize="words"
          />
        </View>
      )}

      <Text style={[styles.duration, { color: theme.mutedForeground }]}>
        {t("welcome.duration", {
          defaultValue: "This will take about 2-4 minutes to complete.",
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xxl,
  },
  header: {
    gap: spacing.md,
    alignItems: "center",
  },
  title: {
    ...typography.h1,
    textAlign: "center",
    lineHeight: 32,
  },
  subtitle: {
    ...typography.body,
    textAlign: "center",
    lineHeight: 22,
  },
  nameCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  namePrompt: {
    ...typography.bodySm,
    fontWeight: "600",
  },
  duration: {
    ...typography.bodySm,
    textAlign: "center",
  },
});
