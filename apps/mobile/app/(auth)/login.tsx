/**
 * Login screen for mobile with Email/Password and Google OAuth via AuthSession.
 */
import { useState } from "react";
import { View, Text, TextInput, Button, Alert } from "react-native";
import * as AuthSession from "expo-auth-session";
import { supabase } from "@/constants/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  async function handleEmailSignIn() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) Alert.alert("Login failed", error.message);
  }

  async function handleGoogleOAuth() {
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: "volleysmart",
        path: "auth-callback",
      });
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUri, skipBrowserRedirect: false },
      });
      if (error) Alert.alert("OAuth error", error.message);
      // After user completes the flow, app resumes, onAuthStateChange fires -> AuthProvider routes to (tabs)
    } catch (e: unknown) {
      Alert.alert(
        "OAuth error",
        e instanceof Error ? e.message : "Unknown error"
      );
    }
  }

  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 12 }}>
        Sign in to VolleySmart
      </Text>
      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, borderRadius: 8, padding: 12 }}
      />
      <Button title="Sign in" onPress={handleEmailSignIn} />
      <View style={{ height: 12 }} />
      <Button title="Continue with Google" onPress={handleGoogleOAuth} />
    </View>
  );
}
