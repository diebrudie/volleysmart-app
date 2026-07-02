import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/constants/supabase";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function MenuDrawer({ visible, onClose }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: player } = usePlayerProfile();

  const fullName = [player?.first_name, player?.last_name]
    .filter(Boolean)
    .join(" ") || "Player";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.drawer,
            {
              backgroundColor: theme.background,
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 16,
            },
          ]}
        >
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.userCard}>
            <Avatar
              uri={player?.image_url}
              name={fullName}
              size={64}
            />
            <Text style={[styles.userName, { color: theme.text }]}>
              {fullName}
            </Text>
            <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
              {user?.email}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.menuItems}>
            <MenuItem
              icon="settings-outline"
              label="Settings"
              theme={theme}
              onPress={() => {}}
            />
            <MenuItem
              icon="notifications-outline"
              label="Notification Settings"
              theme={theme}
              onPress={() => {}}
            />
            <MenuItem
              icon="help-circle-outline"
              label="FAQ"
              theme={theme}
              onPress={() => {}}
            />
          </View>

          <View style={styles.signOutSection}>
            <Button
              title="Sign out"
              variant="danger"
              onPress={() => {
                onClose();
                supabase.auth.signOut();
              }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MenuItem({
  icon,
  label,
  theme,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  theme: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        pressed && { backgroundColor: theme.surface },
      ]}
    >
      <Ionicons name={icon} size={20} color={theme.textSecondary} />
      <Text style={[styles.menuItemLabel, { color: theme.text }]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: "row" },
  backdrop: { flex: 1 },
  drawer: {
    width: width * 0.8,
    maxWidth: 320,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  closeButton: { padding: 4 },
  userCard: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 6,
  },
  userName: { fontSize: 18, fontWeight: "700", marginTop: 8 },
  userEmail: { fontSize: 13 },
  divider: { height: 1, marginVertical: 12, marginHorizontal: 16 },
  menuItems: { paddingHorizontal: 8 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  menuItemLabel: { flex: 1, fontSize: 15 },
  signOutSection: {
    marginTop: "auto",
    paddingHorizontal: 16,
  },
});
