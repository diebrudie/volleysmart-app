import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

type Props = {
  name: string;
  imageUrl?: string | null;
  role?: string | null;
};

export function MemberRow({ name, imageUrl, role }: Props) {
  const t = useTheme();
  const isAdmin = role === "admin" || role === "editor";

  return (
    <View style={styles.row}>
      <Avatar uri={imageUrl} name={name} size={40} />
      <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
        {name}
      </Text>
      {isAdmin && <Badge label={role as string} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  name: { flex: 1, fontSize: 15, fontWeight: "500" },
});
