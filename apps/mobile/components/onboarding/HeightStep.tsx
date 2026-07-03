import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { Input } from "@/components/ui/Input";
import { StepShell } from "@/components/onboarding/StepShell";
import { spacing, typography } from "@/constants/theme";

type Props = {
  height?: number;
  onChange: (height: number | undefined) => void;
};

export function HeightStep({ height, onChange }: Props) {
  const { t } = useTranslation("onboarding");
  const theme = useTheme();

  return (
    <StepShell
      title={t("height.title", { defaultValue: "What's your height?" })}
      subtitle={t("height.subtitle", {
        defaultValue:
          "This helps us create balanced teams for blocking and attacking.",
      })}
    >
      <View style={styles.row}>
        <View style={styles.inputWrap}>
          <Input
            keyboardType="number-pad"
            placeholder="175"
            value={height ? String(height) : ""}
            onChangeText={(text) => {
              const parsed = parseInt(text, 10);
              onChange(Number.isNaN(parsed) ? undefined : parsed);
            }}
            maxLength={3}
          />
        </View>
        <Text style={[styles.unit, { color: theme.mutedForeground }]}>
          {t("height.unit", { defaultValue: "cm" })}
        </Text>
      </View>
    </StepShell>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  inputWrap: {
    width: 120,
  },
  unit: {
    ...typography.bodySm,
  },
});
