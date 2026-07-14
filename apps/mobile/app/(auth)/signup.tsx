import { useState } from "react";
import { View, Text, StyleSheet, Pressable, KeyboardAvoidingView, Platform, ScrollView, Linking } from "react-native";
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

type Step = "email" | "details";

export default function SignupScreen() {
  const { t } = useTranslation("auth");
  const theme = useTheme();
  const router = useRouter();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  function handleContinueWithEmail() {
    if (!email.includes("@")) {
      setError(t("validation:email.invalid", { defaultValue: "Enter a valid email" }));
      return;
    }
    setError("");
    setStep("details");
  }

  async function handleCreateAccount() {
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

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
      },
    });

    setLoading(false);
    if (signUpError) {
      toast(signUpError.message, "error");
    } else {
      router.replace({ pathname: "/(auth)/verify-email", params: { email } });
    }
  }

  return (
    <Screen scroll={false} padded>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: theme.text }]}>
            {t("signup.title")}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {t("signup.subtitle")}
          </Text>

          <View style={styles.form}>
            {step === "email" ? (
              <>
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
                    {t("signup.continueWithGoogle")}
                  </Text>
                </Pressable>
                <View style={styles.divider}>
                  <View style={[styles.line, { backgroundColor: theme.border }]} />
                  <Text style={[styles.dividerText, { color: theme.textSecondary }]}>
                    {t("signup.orSignUpWithEmail")}
                  </Text>
                  <View style={[styles.line, { backgroundColor: theme.border }]} />
                </View>
                <Input
                  label={t("signup.emailAddress")}
                  placeholder={t("signup.emailPlaceholder")}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  error={error}
                />
                <Button
                  title={t("signup.continueWithEmail")}
                  onPress={handleContinueWithEmail}
                />
              </>
            ) : (
              <>
                <Pressable onPress={() => setStep("email")}>
                  <Text style={{ color: theme.textSecondary }}>
                    {t("signup.creatingAccountFor")}{" "}
                    <Text style={{ fontWeight: "600" }}>{email}</Text>{" "}
                    <Text style={{ color: theme.primary }}>{t("signup.edit")}</Text>
                  </Text>
                </Pressable>
                <Input
                  label={t("signup.firstName")}
                  placeholder={t("signup.firstNamePlaceholder")}
                  autoFocus
                  textContentType="givenName"
                  autoComplete="given-name"
                  value={firstName}
                  onChangeText={setFirstName}
                />
                <Input
                  label={t("signup.lastName")}
                  placeholder={t("signup.lastNamePlaceholder")}
                  textContentType="familyName"
                  autoComplete="family-name"
                  value={lastName}
                  onChangeText={setLastName}
                />
                <Input
                  label={t("signup.password")}
                  placeholder={t("signup.passwordPlaceholder")}
                  secureTextEntry
                  textContentType="newPassword"
                  autoComplete="new-password"
                  value={password}
                  onChangeText={setPassword}
                />
                <Input
                  label={t("signup.confirmPassword")}
                  placeholder={t("signup.confirmPasswordPlaceholder")}
                  secureTextEntry
                  textContentType="newPassword"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  error={error}
                />
                <Button
                  title={loading ? t("signup.creatingAccount") : t("signup.createAccount")}
                  onPress={handleCreateAccount}
                  loading={loading}
                />
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={{ color: theme.textSecondary }}>
              {t("signup.alreadyHaveAccount")}{" "}
            </Text>
            <Pressable onPress={() => router.back()}>
              <Text style={{ color: theme.primary, fontWeight: "600" }}>
                {t("signup.logIn")}
              </Text>
            </Pressable>
          </View>

          <View style={styles.legal}>
            <Pressable
              onPress={() =>
                Linking.openURL("https://volleysmart.app/terms").catch(() => {})
              }
            >
              <Text style={[styles.legalLink, { color: theme.textSecondary }]}>
                {t("signup.terms", { defaultValue: "Terms" })}
              </Text>
            </Pressable>
            <Text style={{ color: theme.textSecondary }}> · </Text>
            <Pressable
              onPress={() =>
                Linking.openURL("https://volleysmart.app/privacy").catch(() => {})
              }
            >
              <Text style={[styles.legalLink, { color: theme.textSecondary }]}>
                {t("signup.privacy", { defaultValue: "Privacy Policy" })}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingVertical: 16 },
  title: { fontSize: 26, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 15, textAlign: "center", marginTop: 8, marginBottom: 32 },
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
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  legal: { flexDirection: "row", justifyContent: "center", marginTop: 12 },
  legalLink: { fontSize: 13, textDecorationLine: "underline" },
});
