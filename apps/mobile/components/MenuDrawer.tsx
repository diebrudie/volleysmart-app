/**
 * Hamburger menu — mirrors the PWA's MobileMenuDrawer
 * (apps/web/src/components/nav/MobileMenuDrawer.tsx): full-screen panel
 * sliding in from the RIGHT, tappable user header, grouped items
 * (Help / Preferences / Legal) in rounded bordered cards, log-out footer.
 *
 * Sub-sheets (theme, language, contact) close the drawer first — two
 * stacked RN Modals leave the child unclickable on web (see CLAUDE.md).
 */
import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
  Linking,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/constants/supabase";
import { icons } from "@/constants/icons";
import { Avatar } from "@/components/ui/Avatar";
import { ThemePickerSheet } from "@/components/ThemePickerSheet";
import { LanguagePickerSheet } from "@/components/LanguagePickerSheet";
import { ContactSheet } from "@/components/ContactSheet";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";

const WEB_URL = "https://volleysmart.app";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function MenuDrawer({ visible, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const { data: player } = usePlayerProfile();
  const { width } = useWindowDimensions();

  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;

  const [themeOpen, setThemeOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  // A sub-sheet (theme/language/contact) is its own RN Modal. Presenting it
  // while the drawer Modal is still dismissing freezes iOS. So we defer the
  // open until the drawer's exit animation fully completes — the two Modals
  // are never on screen at the same time.
  const pendingSubRef = useRef<null | "theme" | "language" | "contact">(null);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setMounted(false);
        const pending = pendingSubRef.current;
        if (pending) {
          pendingSubRef.current = null;
          if (pending === "theme") setThemeOpen(true);
          else if (pending === "language") setLanguageOpen(true);
          else if (pending === "contact") setContactOpen(true);
        }
      });
    }
  }, [visible, progress]);

  const fullName =
    [player?.first_name, player?.last_name].filter(Boolean).join(" ") ||
    t("player", { defaultValue: "Player" });

  const navigate = (path: string) => {
    onClose();
    router.push(path as never);
  };

  const openSubSheet = (kind: "theme" | "language" | "contact") => {
    pendingSubRef.current = kind;
    onClose();
  };

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [width, 0],
  });

  return (
    <>
      {mounted && (
        <Modal visible transparent animationType="none" onRequestClose={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: progress }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          </Animated.View>
          <Animated.View
            style={[
              styles.drawer,
              {
                backgroundColor: theme.background,
                paddingTop: insets.top + 8,
                paddingBottom: insets.bottom + 16,
                transform: [{ translateX }],
              },
            ]}
          >
            <View style={styles.closeRow}>
              <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
                <Ionicons name={icons.x} size={24} color={theme.text} />
              </Pressable>
            </View>

            {/* User header */}
            <Pressable style={styles.userCard} onPress={() => navigate("/profile")}>
              <Avatar uri={player?.image_url} name={fullName} size={64} />
              <Text style={[styles.userName, { color: theme.text }]}>
                {fullName}
              </Text>
              {user?.email ? (
                <Text style={[styles.userEmail, { color: theme.mutedForeground }]}>
                  {user.email}
                </Text>
              ) : null}
            </Pressable>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
            >
              <MenuGroup
                label={t("menu.help", { defaultValue: "Help" })}
                theme={theme}
              >
                <MenuItem
                  icon="help-circle-outline"
                  label={t("menu.consultFaq", { defaultValue: "Consult our FAQ" })}
                  theme={theme}
                  onPress={() => navigate("/faq")}
                />
                <MenuItem
                  icon="mail-outline"
                  label={t("nav.contactUs", { defaultValue: "Contact Us" })}
                  theme={theme}
                  onPress={() => openSubSheet("contact")}
                  border={false}
                />
              </MenuGroup>

              <MenuGroup
                label={t("menu.preferences", { defaultValue: "Preferences" })}
                theme={theme}
              >
                <MenuItem
                  icon="globe-outline"
                  label={t("language.title", { defaultValue: "Language" })}
                  theme={theme}
                  onPress={() => openSubSheet("language")}
                />
                <MenuItem
                  icon="moon-outline"
                  label={t("theme.title", { defaultValue: "Theme" })}
                  theme={theme}
                  onPress={() => openSubSheet("theme")}
                />
                <MenuItem
                  icon={icons.bell}
                  label={t("menu.notifications", { defaultValue: "Notifications" })}
                  theme={theme}
                  onPress={() => navigate("/settings/notifications")}
                  showChevron
                  border={false}
                />
              </MenuGroup>

              <MenuGroup
                label={t("menu.legal", { defaultValue: "Legal" })}
                theme={theme}
              >
                <MenuItem
                  icon="document-text-outline"
                  label={t("menu.termsAndConditions", {
                    defaultValue: "Terms and Conditions",
                  })}
                  theme={theme}
                  onPress={() => {
                    onClose();
                    Linking.openURL(`${WEB_URL}/terms`).catch(() => {});
                  }}
                  showChevron
                />
                <MenuItem
                  icon="shield-outline"
                  label={t("menu.privacyPolicy", { defaultValue: "Privacy Policy" })}
                  theme={theme}
                  onPress={() => {
                    onClose();
                    Linking.openURL(`${WEB_URL}/privacy`).catch(() => {});
                  }}
                  showChevron
                  border={false}
                />
              </MenuGroup>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <Pressable
                onPress={() => {
                  onClose();
                  supabase.auth.signOut();
                }}
                style={({ pressed }) => [
                  styles.logoutButton,
                  { borderColor: "#FECACA" },
                  pressed && { backgroundColor: "rgba(239, 68, 68, 0.08)" },
                ]}
              >
                <Ionicons name="log-out-outline" size={16} color="#dc2626" />
                <Text style={styles.logoutText}>
                  {t("nav.logOut", { defaultValue: "Log out" })}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </Modal>
      )}

      <ThemePickerSheet visible={themeOpen} onClose={() => setThemeOpen(false)} />
      <LanguagePickerSheet
        visible={languageOpen}
        onClose={() => setLanguageOpen(false)}
      />
      <ContactSheet
        visible={contactOpen}
        onClose={() => setContactOpen(false)}
        source="hamburger_menu"
      />
    </>
  );
}

function MenuGroup({
  label,
  theme,
  children,
}: {
  label: string;
  theme: ReturnType<typeof useTheme>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      <Text style={[styles.groupLabel, { color: theme.mutedForeground }]}>
        {label.toUpperCase()}
      </Text>
      <View
        style={[
          styles.groupCard,
          { borderColor: theme.cardBorder, backgroundColor: theme.card },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  theme,
  onPress,
  showChevron,
  border = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  theme: ReturnType<typeof useTheme>;
  onPress: () => void;
  showChevron?: boolean;
  border?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        border && { borderBottomWidth: 1, borderBottomColor: theme.border },
        pressed && { backgroundColor: theme.muted },
      ]}
    >
      <Ionicons name={icon} size={20} color={theme.text} />
      <Text style={[styles.menuItemLabel, { color: theme.text }]}>{label}</Text>
      {showChevron && (
        <Ionicons
          name={icons.chevronRight}
          size={16}
          color={theme.mutedForeground}
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  drawer: {
    ...StyleSheet.absoluteFillObject,
  },
  closeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
  },
  closeButton: { padding: 4 },
  userCard: {
    alignItems: "center",
    paddingBottom: 16,
    paddingHorizontal: 16,
    gap: 2,
  },
  userName: { fontSize: 18, fontWeight: "600", marginTop: 8 },
  userEmail: { fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 24,
  },
  group: {},
  groupLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  groupCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemLabel: { flex: 1, fontSize: 14, fontWeight: "500" },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  logoutText: {
    color: "#dc2626",
    fontWeight: "500",
    fontSize: 15,
  },
});
