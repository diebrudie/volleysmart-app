/**
 * Language picker — mobile counterpart of the PWA's LanguageSwitcher
 * (apps/web/src/components/common/LanguageSwitcher.tsx).
 */
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { LANG_STORAGE_KEY } from "@/constants/i18n";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" },
] as const;

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function LanguagePickerSheet({ visible, onClose }: Props) {
  const { i18n, t } = useTranslation("common");

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
    AsyncStorage.setItem(LANG_STORAGE_KEY, code).catch(() => {});
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t("language.title", { defaultValue: "Language" })}
    >
      <View style={styles.options}>
        {LANGUAGES.map(({ code, label }) => (
          <Button
            key={code}
            title={label}
            variant={i18n.language === code ? "primary" : "outline"}
            onPress={() => handleChange(code)}
          />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: 12,
    paddingBottom: 8,
  },
});
