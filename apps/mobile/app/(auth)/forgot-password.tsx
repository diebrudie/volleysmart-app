import { useState } from "react";
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/constants/supabase";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { useTheme } from "@/hooks/useTheme";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation("auth");
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) {
      toast(error.message, "error");
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <Screen scroll={false} padded>
        <View style={styles.center}>
          <Text style={[styles.title, { color: theme.text }]}>
            {t("forgotPassword.checkYourEmail")}
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            {t("forgotPassword.emailSentDescription")}
          </Text>
          <Button
            title={t("forgotPassword.returnToLogin")}
            onPress={() => router.back()}
            style={{ marginTop: 24 }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.center}>
          <Text style={[styles.title, { color: theme.text }]}>
            {t("login.forgotPassword")}
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            {t("forgotPassword.description")}
          </Text>

          <View style={styles.form}>
            <Input
              label={t("forgotPassword.email")}
              placeholder={t("forgotPassword.emailPlaceholder")}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
            <Button
              title={loading ? t("forgotPassword.sending") : t("forgotPassword.sendResetLink")}
              onPress={handleSend}
              loading={loading}
            />
          </View>

          <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ color: theme.primary, textAlign: "center", fontWeight: "600" }}>
              {t("forgotPassword.returnToLogin")}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", textAlign: "center", marginBottom: 12 },
  body: { fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  form: { gap: 16 },
});
