import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { markIntroSeen } from "@/constants/introSeen";
import { useTheme } from "@/hooks/useTheme";

/**
 * Pre-auth intro carousel shown on first launch only (gated by the
 * `volleysmart-intro-seen` flag in AuthProvider). Returning users skip
 * straight to the login screen.
 */
export default function IntroScreen() {
  const { t } = useTranslation("auth");
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const slides = [
    {
      emoji: "🏐",
      title: t("intro.slide1Title", {
        defaultValue: "Balanced teams, zero arguments",
      }),
      body: t("intro.slide1Body", {
        defaultValue:
          "VolleySmart builds fair, balanced teams from everyone's positions and skill — in seconds.",
      }),
    },
    {
      emoji: "📅",
      title: t("intro.slide2Title", {
        defaultValue: "Plan games, know who's coming",
      }),
      body: t("intro.slide2Body", {
        defaultValue:
          "Create events, collect RSVPs, and organise your club without the group-chat chaos.",
      }),
    },
    {
      emoji: "📊",
      title: t("intro.slide3Title", { defaultValue: "Score, track, improve" }),
      body: t("intro.slide3Body", {
        defaultValue:
          "Keep live scores and follow your stats and history across every game you play.",
      }),
    },
  ];

  // markIntroSeen runs on any exit path so the carousel never shows again.
  const leave = (to: "/(auth)/signup" | "/(auth)/login") => {
    void markIntroSeen();
    router.replace(to);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== index) setIndex(next);
  };

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.flex}>
        <View style={styles.topBar}>
          <Image
            source={require("@/assets/images/logo-lightmode.svg")}
            style={styles.logo}
            contentFit="contain"
          />
          <Pressable onPress={() => leave("/(auth)/login")} hitSlop={8}>
            <Text style={[styles.skip, { color: theme.textSecondary }]}>
              {t("intro.skip", { defaultValue: "Skip" })}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          style={styles.flex}
        >
          {slides.map((s, i) => (
            <View key={i} style={[styles.slide, { width }]}>
              <View
                style={[styles.emojiWrap, { backgroundColor: theme.surface }]}
              >
                <Text style={styles.emoji}>{s.emoji}</Text>
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                {s.title}
              </Text>
              <Text style={[styles.body, { color: theme.textSecondary }]}>
                {s.body}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i === index ? theme.primary : theme.inputBorder,
                    width: i === index ? 22 : 8,
                  },
                ]}
              />
            ))}
          </View>

          <Button
            title={t("intro.getStarted", { defaultValue: "Get Started" })}
            onPress={() => leave("/(auth)/signup")}
          />

          <Pressable
            onPress={() => leave("/(auth)/login")}
            style={styles.loginRow}
          >
            <Text style={{ color: theme.textSecondary }}>
              {t("intro.haveAccount", { defaultValue: "Already have an account?" })}{" "}
            </Text>
            <Text style={{ color: theme.primary, fontWeight: "600" }}>
              {t("intro.logIn", { defaultValue: "Log in" })}
            </Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  logo: { width: 150, height: 30 },
  skip: { fontSize: 15, fontWeight: "500" },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 20,
  },
  emojiWrap: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emoji: { fontSize: 64 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 30,
  },
  body: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 20,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: { height: 8, borderRadius: 4 },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
});
