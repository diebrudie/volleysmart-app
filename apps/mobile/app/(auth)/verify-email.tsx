import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { useTheme } from "@/hooks/useTheme";

export default function VerifyEmailScreen() {
  const { t } = useTranslation("auth");
  const theme = useTheme();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown <= 0) {
      router.replace("/(auth)/login");
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, router]);

  return (
    <Screen scroll={false} padded>
      <View style={styles.center}>
        <Text style={[styles.title, { color: theme.text }]}>
          {t("verifyEmail.title")}
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          {t("verifyEmail.sentTo")}
        </Text>
        <Text style={[styles.email, { color: theme.text }]}>{email}</Text>
        <Text style={[styles.body, { color: theme.textSecondary, marginTop: 16 }]}>
          {t("verifyEmail.instructions")}
        </Text>

        <Text style={[styles.countdown, { color: theme.textSecondary }]}>
          {t("verifyEmail.redirecting", { countdown })}
        </Text>

        <Button
          title={t("verifyEmail.goToLogin")}
          onPress={() => router.replace("/(auth)/login")}
          style={{ marginTop: 16 }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  body: { fontSize: 15, textAlign: "center", lineHeight: 22, paddingHorizontal: 16 },
  email: { fontSize: 16, fontWeight: "600", marginTop: 8 },
  countdown: { fontSize: 14, marginTop: 24 },
});
