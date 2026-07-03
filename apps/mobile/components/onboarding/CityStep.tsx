import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { Input } from "@/components/ui/Input";
import { StepShell } from "@/components/onboarding/StepShell";
import { icons } from "@/constants/icons";
import { spacing, typography } from "@/constants/theme";

type Props = {
  city: string;
  country: string;
  onCityChange: (value: string) => void;
  onCountryChange: (value: string) => void;
};

/**
 * City step. The web app uses Mapbox autocomplete (CityLocationSelector);
 * mobile has no Mapbox token, so this is a plain city + country form.
 */
export function CityStep({ city, country, onCityChange, onCountryChange }: Props) {
  const { t } = useTranslation("onboarding");
  const theme = useTheme();

  return (
    <StepShell
      title={t("city.title", {
        defaultValue: "Which city are you based in?",
      })}
      subtitle={t("city.subtitle", {
        defaultValue:
          "This helps us connect you with local players and clubs.",
      })}
    >
      <View style={styles.fields}>
        <Input
          label={t("city.label", { defaultValue: "City" })}
          placeholder={t("city.placeholder", {
            defaultValue: "Start typing your city...",
          })}
          value={city}
          onChangeText={onCityChange}
          autoCapitalize="words"
        />
        <Input
          label={t("city.countryLabel", { defaultValue: "Country" })}
          placeholder={t("city.countryPlaceholder", {
            defaultValue: "Germany",
          })}
          value={country}
          onChangeText={onCountryChange}
          autoCapitalize="words"
        />
        {city.trim() ? (
          <View style={styles.confirmRow}>
            <Ionicons
              name={icons.mapPin}
              size={14}
              color={theme.mutedForeground}
            />
            <Text style={[styles.confirmText, { color: theme.mutedForeground }]}>
              {country.trim() ? `${city.trim()}, ${country.trim()}` : city.trim()}
            </Text>
          </View>
        ) : null}
      </View>
    </StepShell>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: spacing.lg,
  },
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  confirmText: {
    ...typography.bodySm,
  },
});
