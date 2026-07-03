import { View, Text, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar } from "@/components/ui/Avatar";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { usePlayerProfile } from "@/hooks/usePlayerProfile";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { icons } from "@/constants/icons";

type Props = {
  title: string;
  onMenuPress: () => void;
};

export function TopBar({ title, onMenuPress }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: player } = usePlayerProfile();
  const { data: unreadCount = 0 } = useUnreadNotifications();

  const fullName = [player?.first_name, player?.last_name]
    .filter(Boolean)
    .join(" ");

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          backgroundColor: theme.background,
          borderBottomColor: theme.border,
        },
      ]}
    >
      <Pressable
        onPress={() => router.push("/profile")}
        style={styles.avatarButton}
      >
        <Avatar
          uri={player?.image_url}
          name={fullName || user?.user_metadata?.first_name}
          size={32}
        />
      </Pressable>

      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

      <View style={styles.actions}>
        <Pressable style={styles.iconButton} disabled>
          <Ionicons
            name="chatbubble-outline"
            size={22}
            color={theme.textSecondary}
            style={{ opacity: 0.4 }}
          />
        </Pressable>

        <Pressable
          style={styles.iconButton}
          onPress={() => router.push("/notifications")}
        >
          <View>
            <Ionicons name={icons.bell} size={22} color={theme.text} />
            {unreadCount > 0 && <View style={styles.badge} />}
          </View>
        </Pressable>

        <Pressable style={styles.iconButton} onPress={onMenuPress}>
          <Ionicons name={icons.menu} size={24} color={theme.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  avatarButton: {
    width: 32,
    height: 32,
  },
  title: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconButton: {
    padding: 6,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
});
