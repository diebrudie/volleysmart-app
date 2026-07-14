import { StyleSheet, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { DateField } from "@/components/ui/DateField";
import { StepShell } from "@/components/onboarding/StepShell";
import { typography } from "@/constants/theme";

type Props = {
  value: Date | null;
  onChange: (date: Date) => void;
  /** True when the picked date is less than 10 years in the past. */
  tooRecent: boolean;
};

export function BirthdayStep({ value, onChange, tooRecent }: Props) {
  const { t } = useTranslation("onboarding");
  const theme = useTheme();

  return (
    <StepShell
      title={t("birthday.title", { defaultValue: "When's your birthday?" })}
    >
      <DateField
        value={value}
        onChange={onChange}
        placeholder={t("birthday.placeholder", {
          defaultValue: "Pick a date",
        })}
      />
      {tooRecent ? (
        <Text style={[styles.error, { color: theme.danger }]}>
          {t("birthday.tooRecent", {
            defaultValue: "Please pick a date at least 10 years in the past.",
          })}
        </Text>
      ) : null}
    </StepShell>
  );
}

const styles = StyleSheet.create({
  error: {
    ...typography.bodySm,
  },
});
