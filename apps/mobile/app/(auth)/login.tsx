import { useState } from "react";
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import * as AuthSession from "expo-auth-session";
import { useTranslation } from "react-i18next";
import { supabase } from "@/constants/supabase";
import { Screen } from "@/components/ui/Screen";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { GoogleIcon } from "@/components/ui/GoogleIcon";
import { toast } from "@/components/ui/Toast";
import { useTheme } from "@/hooks/useTheme";

export default function LoginScreen() {
  const { t } = useTranslation("auth");
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  async function handleEmailSignIn() {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast(error.message, "error");
  }

  async function handleGoogleOAuth() {
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: "volleysmart",
        path: "auth-callback",
      });
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUri, skipBrowserRedirect: false },
      });
      if (error) toast(error.message, "error");
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : "OAuth error", "error");
    }
  }

  return (
    <Screen scroll={false} padded>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <View style={styles.center}>
          <Image
            source={require("@/assets/images/logo-lightmode.svg")}
            style={styles.logo}
            contentFit="contain"
          />

          <Text style={[styles.title, { color: theme.text }]}>
            {t("login.title")}
          </Text>

          <View style={styles.form}>
            <Pressable
              onPress={handleGoogleOAuth}
              style={({ pressed }) => [
                styles.googleBtn,
                {
                  borderColor: theme.inputBorder,
                  backgroundColor: pressed ? theme.surface : theme.background,
                },
              ]}
            >
              <GoogleIcon size={20} />
              <Text style={[styles.googleText, { color: theme.text }]}>
                {t("login.continueWithGoogle")}
              </Text>
            </Pressable>

            {!showEmail ? (
              <Pressable onPress={() => setShowEmail(true)}>
                <Text style={[styles.linkMuted, { color: theme.textSecondary }]}>
                  {t("login.orContinueWithEmail")}
                </Text>
              </Pressable>
            ) : (
              <>
                <View style={styles.divider}>
                  <View style={[styles.line, { backgroundColor: theme.border }]} />
                  <Text style={[styles.dividerText, { color: theme.textSecondary }]}>
                    {t("login.orContinueWithEmail")}
                  </Text>
                  <View style={[styles.line, { backgroundColor: theme.border }]} />
                </View>

                <Input
                  label={t("login.email")}
                  placeholder={t("login.emailPlaceholder")}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                />
                <Input
                  label={t("login.password")}
                  placeholder={t("login.passwordPlaceholder")}
                  secureTextEntry
                  textContentType="password"
                  autoComplete="password"
                  value={password}
                  onChangeText={setPassword}
                />
                <Button
                  title={loading ? t("login.submitting") : t("login.submit")}
                  onPress={handleEmailSignIn}
                  loading={loading}
                />

                <Pressable onPress={() => router.push("/(auth)/forgot-password")}>
                  <Text style={[styles.forgotRow, { color: theme.textSecondary }]}>
                    {t("login.forgotPassword")}{" "}
                    <Text style={{ color: theme.primary, fontWeight: "600" }}>
                      {t("login.resetItHere")}
                    </Text>
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={{ color: theme.textSecondary }}>
              {t("login.newToVolleySmart")}{" "}
            </Text>
            <Pressable onPress={() => router.push("/(auth)/signup")}>
              <Text style={{ color: theme.primary, fontWeight: "600" }}>
                {t("login.createAccount")}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center" },
  logo: { width: 220, height: 44, alignSelf: "center", marginBottom: 32 },
  title: { fontSize: 22, fontWeight: "600", textAlign: "center", marginBottom: 28 },
  form: { gap: 16 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  googleText: { fontSize: 16, fontWeight: "500" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 },
  line: { flex: 1, height: 1 },
  dividerText: { fontSize: 13 },
  linkMuted: { fontSize: 14, textAlign: "center", marginTop: 4 },
  forgotRow: { fontSize: 14, textAlign: "center", marginTop: 4 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
});
