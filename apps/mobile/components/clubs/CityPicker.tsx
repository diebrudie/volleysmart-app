import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/hooks/useTheme";
import { Input } from "@/components/ui/Input";
import { icons } from "@/constants/icons";
import { radii, spacing, typography } from "@/constants/theme";

export type CityLocationValue = {
  city: string;
  country: string;
  countryCode: string; // ISO alpha-2 (uppercase)
};

type MapboxContext = {
  id: string; // e.g. "country.12345"
  text: string; // e.g. "Germany"
  short_code?: string; // e.g. "de"
};
type MapboxFeature = {
  id: string;
  text?: string; // place name without region
  context?: MapboxContext[];
};
type MapboxPlacesResponse = {
  features?: MapboxFeature[];
};

/**
 * Mapbox token. Mirrors the web CityLocationSelector (VITE_MAPBOX_TOKEN);
 * Expo inlines EXPO_PUBLIC_* vars from apps/mobile/.env at build time.
 */
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

type Props = {
  label?: string;
  placeholder?: string;
  /** Current city text (controlled). */
  city: string;
  /** Country of the current selection, if any — used for the confirm row. */
  selectedCountry?: string | null;
  /** Free typing — parent should clear country/countryCode. */
  onCityChange: (text: string) => void;
  /** A suggestion was picked. */
  onSelect: (value: CityLocationValue) => void;
};

/**
 * City-only autocomplete backed by the Mapbox Places API — the mobile
 * counterpart of apps/web CityLocationSelector (types=place). Suggestions
 * render INLINE below the input (no nested RN Modal, so it is safe inside
 * a Sheet). Degrades to a plain text input when the token is missing.
 */
export function CityPicker({
  label,
  placeholder,
  city,
  selectedCountry,
  onCityChange,
  onSelect,
}: Props) {
  const theme = useTheme();
  const { t, i18n } = useTranslation("clubs");
  const [options, setOptions] = useState<CityLocationValue[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const token = MAPBOX_TOKEN;
    // Only search while the dropdown is open (i.e. the user is typing).
    if (!open || !city || city.length < 2 || !token) {
      setOptions([]);
      return;
    }

    let active = true;

    const fetchPlaces = async () => {
      try {
        // Query string built by hand — Hermes' URL/URLSearchParams is
        // not fully implemented on native.
        const params = [
          "types=place",
          `language=${encodeURIComponent(i18n.language || "en")}`,
          "limit=5",
          `access_token=${encodeURIComponent(token)}`,
        ].join("&");
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          city
        )}.json?${params}`;

        const res = await fetch(url);
        if (!res.ok) return;
        const data = (await res.json()) as MapboxPlacesResponse;

        const mapped: CityLocationValue[] = (data.features ?? [])
          .map((f) => {
            const place = f.text ?? "";
            const countryCtx = (f.context ?? []).find((c) =>
              c.id.startsWith("country")
            );
            return {
              city: place,
              country: countryCtx?.text ?? "",
              countryCode: (countryCtx?.short_code ?? "").toUpperCase(),
            };
          })
          .filter((v) => v.city && v.country && v.countryCode);

        if (active) setOptions(mapped);
      } catch {
        // Network hiccup — keep whatever is typed, no suggestions.
        if (active) setOptions([]);
      }
    };

    const timer = setTimeout(fetchPlaces, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [city, open, i18n.language]);

  const handleSelect = (opt: CityLocationValue) => {
    setOpen(false);
    setOptions([]);
    onSelect(opt);
  };

  return (
    <View style={styles.wrapper}>
      <Input
        label={label}
        value={city}
        placeholder={placeholder}
        autoCapitalize="words"
        autoCorrect={false}
        onChangeText={(text) => {
          setOpen(true);
          onCityChange(text);
        }}
      />

      {open && options.length > 0 ? (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {options.map((opt, idx) => (
            <Pressable
              key={`${opt.city}-${opt.countryCode}-${idx}`}
              onPress={() => handleSelect(opt)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.option,
                idx < options.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.border,
                },
                pressed && { backgroundColor: theme.muted },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[styles.optionText, { color: theme.text }]}
              >
                {opt.city}, {opt.country} ({opt.countryCode})
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {selectedCountry && city.trim() ? (
        <View style={styles.confirmRow}>
          <Ionicons
            name={icons.mapPin}
            size={13}
            color={theme.mutedForeground}
          />
          <Text
            numberOfLines={1}
            style={[styles.confirmText, { color: theme.mutedForeground }]}
          >
            {city.trim()}, {selectedCountry}
          </Text>
        </View>
      ) : null}

      {!MAPBOX_TOKEN ? (
        <Text style={[styles.hint, { color: theme.mutedForeground }]}>
          {t("settings.mapboxDisabled", {
            defaultValue: "City autocomplete is unavailable.",
          })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  dropdown: {
    borderWidth: 1,
    borderRadius: radii.md,
    overflow: "hidden",
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  optionText: { ...typography.bodySm },
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
  },
  confirmText: { ...typography.caption },
  hint: { ...typography.caption },
});
