import { Stack } from "expo-router";
import { ForceLight } from "@/providers/ThemeProvider";

// Auth screens are always light, matching the PWA's enforced-light routes.
export default function AuthLayout() {
  return (
    <ForceLight>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="reset-password" />
        <Stack.Screen name="verify-email" />
      </Stack>
    </ForceLight>
  );
}
