import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { type MemberClubWithDetails } from "@volleysmart/core";

type Props = {
  club: MemberClubWithDetails;
  onPress?: () => void;
};

export function ClubCard({ club, onPress }: Props) {
  const t = useTheme();
  const isAdmin = club.role === "admin" || club.role === "editor";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: t.surface, borderColor: t.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Avatar
        uri={club.clubs?.image_url}
        name={club.clubs?.name}
        size={48}
      />

      <View style={styles.content}>
        <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
          {club.clubs?.name ?? "Club"}
        </Text>
        {club.clubs?.city && (
          <Text style={[styles.city, { color: t.textSecondary }]}>
            {club.clubs.city}
          </Text>
        )}
        {isAdmin && <Badge label={club.role as string} style={styles.badge} />}
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={t.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  content: { flex: 1, gap: 2 },
  name: { fontSize: 16, fontWeight: "600" },
  city: { fontSize: 13 },
  badge: { marginTop: 2 },
});
