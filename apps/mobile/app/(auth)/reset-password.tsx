import { useState } from "react";
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { supabase } from "@/constants/supabase";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { useTheme } from "@/hooks/useTheme";

export default function ResetPasswordScreen() {
  const { t } = useTranslation("auth");
  const theme = useTheme();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleReset() {
    if (password !== confirmPassword) {
      setError(t("signup.passwordsDoNotMatch"));
      return;
    }
    if (password.length < 6) {
      setError(t("validation:password.minLength", { defaultValue: "Password must be at least 6 characters" }));
      return;
    }
    setError("");
    setLoading(true);
    const { error: resetError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (resetError) {
      toast(resetError.message, "error");
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <Screen scroll={false} padded>
        <View style={styles.center}>
          <Text style={[styles.title, { color: theme.text }]}>
            {t("resetPassword.passwordUpdated")}
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            {t("resetPassword.passwordUpdatedDescription")}
          </Text>
          <Button
            title={t("resetPassword.backToLogin")}
            onPress={() => router.replace("/(auth)/login")}
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
            {t("resetPassword.title")}
          </Text>
          <Text style={[styles.body, { color: theme.textSecondary }]}>
            {t("resetPassword.subtitle")}
          </Text>

          <View style={styles.form}>
            <Input
              label={t("resetPassword.newPassword")}
              placeholder={t("resetPassword.newPasswordPlaceholder")}
              secureTextEntry
              textContentType="newPassword"
              autoComplete="new-password"
              value={password}
              onChangeText={setPassword}
            />
            <Input
              label={t("resetPassword.confirmPassword")}
              placeholder={t("resetPassword.confirmPasswordPlaceholder")}
              secureTextEntry
              textContentType="newPassword"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={error}
            />
            <Button
              title={loading ? t("resetPassword.resetting") : t("resetPassword.submit")}
              onPress={handleReset}
              loading={loading}
            />
          </View>
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
