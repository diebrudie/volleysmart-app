import { useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { Sheet } from "@/components/ui/Sheet";
import { useTheme } from "@/hooks/useTheme";
import { icons } from "@/constants/icons";
import { spacing, typography } from "@/constants/theme";

// Language-specific court diagrams. Metro needs static require() paths, so the
// three supported languages are mapped explicitly (falls back to EN).
const DIAGRAMS = {
  en: require("../../assets/positions/positions-en.png"),
  de: require("../../assets/positions/positions-de.png"),
  es: require("../../assets/positions/positions-es.png"),
} as const;

type Lang = keyof typeof DIAGRAMS;

/**
 * Help icon shown next to the position questions. Tapping it opens a bottom
 * sheet with a volleyball court diagram in the user's language (EN/DE/ES).
 * Ports the PWA's positions-help drawer to the mobile onboarding.
 */
export function PositionsHelp() {
  const { t, i18n } = useTranslation("onboarding");
  const theme = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [open, setOpen] = useState(false);

  const short = (i18n.language || "en").slice(0, 2);
  const lang: Lang = short === "de" || short === "es" ? short : "en";

  // Size the diagram to the sheet's inner width (window minus the sheet's
  // horizontal padding on both sides). Percentage widths don't resolve inside
  // the sheet's ScrollView, so the image would otherwise render at its full
  // intrinsic pixel width and overflow the screen. Ratio comes from the asset.
  const source = DIAGRAMS[lang];
  const meta = Image.resolveAssetSource(source);
  const ratio = meta?.width && meta?.height ? meta.width / meta.height : 1280 / 800;
  const imageWidth = windowWidth - spacing.lg * 2;
  const imageHeight = imageWidth / ratio;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t("positionsHelp.showDiagram", {
          defaultValue: "Show positions diagram",
        })}
      >
        <Ionicons name={icons.helpCircle} size={24} color={theme.primary} />
      </Pressable>

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title={t("positionsHelp.title", {
          defaultValue: "Volleyball positions",
        })}
      >
        <View style={styles.body}>
          <Text style={[styles.description, { color: theme.mutedForeground }]}>
            {t("positionsHelp.description", {
              defaultValue:
                "Where each position plays on the court. Pick the one that fits you best.",
            })}
          </Text>
          <Image
            source={source}
            style={[
              styles.diagram,
              { width: imageWidth, height: imageHeight },
            ]}
            resizeMode="contain"
            accessibilityLabel={t("positionsHelp.diagramAlt", {
              defaultValue: "Volleyball court positions diagram",
            })}
          />
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  description: {
    ...typography.bodySm,
    lineHeight: 20,
  },
  diagram: {
    alignSelf: "center",
    borderRadius: 12,
  },
});
