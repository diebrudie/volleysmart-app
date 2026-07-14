import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { CoreBootstrap } from "@/providers/CoreBootstrap";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { ThemeProvider, useResolvedScheme } from "@/providers/ThemeProvider";
import { RealtimeEffects } from "@/providers/RealtimeEffects";
import { ToastHost } from "@/components/ui/Toast";
import "@/constants/i18n";

function ThemedStatusBar() {
  const scheme = useResolvedScheme();
  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <CoreBootstrap>
          <QueryProvider>
            <AuthProvider>
              <ThemeProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="profile" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="notifications" />
                <Stack.Screen name="settings/notifications" />
                <Stack.Screen name="faq" />
                <Stack.Screen name="events/[id]" />
                <Stack.Screen name="events/create" />
                <Stack.Screen name="events/discover" />
                <Stack.Screen name="clubs/[id]/index" />
                <Stack.Screen name="clubs/[id]/manage-members" />
                <Stack.Screen name="clubs/[id]/invite" />
                <Stack.Screen name="clubs/create" />
                <Stack.Screen name="invite/[token]" />
                <Stack.Screen name="games/[matchDayId]/index" />
                <Stack.Screen name="games/[matchDayId]/live-score" />
                <Stack.Screen name="games/[matchDayId]/edit" />
                <Stack.Screen name="games/new" />
              </Stack>
              <RealtimeEffects />
              <ToastHost />
              <ThemedStatusBar />
              </ThemeProvider>
            </AuthProvider>
          </QueryProvider>
        </CoreBootstrap>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
