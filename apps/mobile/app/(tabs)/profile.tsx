import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import { supabase } from "@/constants/supabase";
import { Screen } from "@/components/ui/Screen";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";

export default function ProfileScreen() {
  const { t } = useTranslation("profile");
  const theme = useTheme();
  const { user } = useAuth();

  const firstName = user?.user_metadata?.first_name ?? "";
  const lastName = user?.user_metadata?.last_name ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Player";

  return (
    <Screen>
      <View style={styles.header}>
        <Avatar name={fullName} size={72} />
        <Text style={[styles.name, { color: theme.text }]}>{fullName}</Text>
        <Text style={[styles.email, { color: theme.textSecondary }]}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Button
          title={t("signOut", { defaultValue: "Sign out" })}
          variant="outline"
          onPress={() => supabase.auth.signOut()}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginTop: 24, marginBottom: 32, gap: 8 },
  name: { fontSize: 22, fontWeight: "700" },
  email: { fontSize: 14 },
  section: { gap: 12 },
});
