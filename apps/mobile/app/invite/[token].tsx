import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { useAcceptInvitation, useInviteValidation } from "@/hooks/useInvite";
import { icons } from "@/constants/icons";
import {
  clearPendingInviteToken,
  setPendingInviteToken,
} from "@/constants/pendingInvite";
import { palette, radii, spacing, typography } from "@/constants/theme";

/**
 * Join-via-invite-link flow (web InvitePage.tsx).
 * Deep link target: volleysmart://invite/<token>
 */
export default function InviteTokenScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { t } = useTranslation("clubs");
  const theme = useTheme();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const trimmedToken = (token ?? "").trim();
  const {
    data: validation,
    isLoading: validating,
    isError: validationError,
  } = useInviteValidation(trimmedToken || undefined);
  const acceptMut = useAcceptInvitation();

  // Persist the token while unauthenticated so login/onboarding can route
  // back here; clear it once the user views the invite signed in (web
  // InvitePage.tsx pendingInviteToken behavior).
  useEffect(() => {
    if (authLoading || !trimmedToken) return;
    if (!user) {
      void setPendingInviteToken(trimmedToken);
    } else {
      void clearPendingInviteToken();
    }
  }, [authLoading, user, trimmedToken]);

  const goToClubs = () => router.replace("/(tabs)/clubs");
  const goHome = () => router.replace("/(tabs)");

  const handleAccept = () => {
    acceptMut.mutate(trimmedToken, {
      onSuccess: (result) => {
        if (result.result_status === "already_member") {
          toast(
            t("invitePage.alreadyMember", {
              defaultValue: "You're already a member of this club.",
            }),
            "info"
          );
        } else if (result.result_status === "already_pending") {
          toast(
            t("invitePage.alreadyPending", {
              defaultValue:
                "Request already pending. An admin needs to approve it.",
            }),
            "info"
          );
        } else {
          toast(
            t("invitePage.requestSent", {
              defaultValue:
                "Request sent! The club admins will review it shortly.",
            })
          );
        }
        // The validate/accept RPCs don't return the club id, so land on the
        // Clubs tab (web navigates to /clubs too).
        goToClubs();
      },
      onError: (error) => {
        const msg = String(error.message || "").toLowerCase();
        if (msg.includes("invitation_invalid")) {
          toast(
            t("invitePage.invalidToast", {
              defaultValue:
                "Invite no longer valid. The link has expired or been revoked.",
            }),
            "error"
          );
        } else {
          toast(
            t("invitePage.genericError", {
              defaultValue: "Something went wrong. Please try again.",
            }),
            "error"
          );
        }
        goHome();
      },
    });
  };

  const clubName =
    validation?.club_name ??
    t("invitePage.fallbackClubName", { defaultValue: "Club" });

  const header = (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader
        title={t("invitePage.title", { defaultValue: "Club Invitation" })}
      />
    </>
  );

  // ── Loading ──────────────────────────────────────────────────────────
  if (authLoading || validating) {
    return (
      <>
        {header}
        <Screen scroll={false} safeTop={false}>
          <View style={styles.center}>
            <Spinner />
          </View>
        </Screen>
      </>
    );
  }

  // ── Invalid token ────────────────────────────────────────────────────
  if (!validation?.valid || validationError) {
    return (
      <>
        {header}
        <Screen scroll={false} safeTop={false}>
          <View style={styles.center}>
            <Ionicons
              name={icons.alertCircle}
              size={48}
              color={theme.icon}
              style={styles.stateIcon}
            />
            <Text style={[styles.stateTitle, { color: theme.text }]}>
              {t("invitePage.invalidTitle", {
                defaultValue: "This invite link is no longer valid",
              })}
            </Text>
            <Text style={[styles.stateText, { color: theme.textSecondary }]}>
              {t("invitePage.invalidDescription", {
                defaultValue:
                  "The link may have expired, been revoked, or the inviter is no longer a member.",
              })}
            </Text>
            <Button
              title={t("invitePage.goToApp", {
                defaultValue: "Go to VolleySmart",
              })}
              variant="outline"
              onPress={goHome}
              style={styles.stateButton}
            />
          </View>
        </Screen>
      </>
    );
  }

  // Club card (image header + content) shared by the remaining states.
  const clubCard = (children: React.ReactNode) => (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.cardBorder },
      ]}
    >
      {validation.club_image ? (
        <Image
          source={{ uri: validation.club_image }}
          style={styles.cardImage}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View
          style={[styles.cardImage, { backgroundColor: theme.primary }]}
        >
          <Text style={styles.cardImageInitial}>
            {clubName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );

  // ── Unauthenticated (deep link opened before login) ──────────────────
  if (!user) {
    return (
      <>
        {header}
        <Screen safeTop={false}>
          {clubCard(
            <>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {t("invitePage.invitedTitle", {
                  name: clubName,
                  defaultValue:
                    "You've been invited to join {{name}} on VolleySmart",
                })}
              </Text>
              <Text
                style={[styles.cardText, { color: theme.textSecondary }]}
              >
                {t("invitePage.loginPrompt", {
                  defaultValue:
                    "Create an account or log in to accept this invitation.",
                })}
              </Text>
              <View style={styles.buttonRow}>
                <Button
                  title={t("invitePage.signUp", { defaultValue: "Sign up" })}
                  onPress={() => router.replace("/(auth)/signup")}
                  style={styles.flexButton}
                />
                <Button
                  title={t("invitePage.logIn", { defaultValue: "Log in" })}
                  variant="outline"
                  onPress={() => router.replace("/(auth)/login")}
                  style={styles.flexButton}
                />
              </View>
            </>
          )}
        </Screen>
      </>
    );
  }

  // ── Already a member ─────────────────────────────────────────────────
  if (validation.user_status === "already_member") {
    return (
      <>
        {header}
        <Screen safeTop={false}>
          {clubCard(
            <>
              <View style={styles.titleRow}>
                <Ionicons
                  name={icons.checkCircleOutline}
                  size={20}
                  color={theme.textSecondary}
                />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {t("invitePage.alreadyMemberTitle", {
                    defaultValue: "Already a member",
                  })}
                </Text>
              </View>
              <Text
                style={[styles.cardText, { color: theme.textSecondary }]}
              >
                {t("invitePage.alreadyMemberDescription", {
                  name: clubName,
                  defaultValue: "You're already a member of {{name}}.",
                })}
              </Text>
              <Button
                title={t("invitePage.goToClubs", {
                  defaultValue: "Go to Clubs",
                })}
                variant="outline"
                onPress={goToClubs}
                style={styles.fullButton}
              />
            </>
          )}
        </Screen>
      </>
    );
  }

  // ── Already pending ──────────────────────────────────────────────────
  if (validation.user_status === "already_pending") {
    return (
      <>
        {header}
        <Screen safeTop={false}>
          {clubCard(
            <>
              <View style={styles.titleRow}>
                <Ionicons
                  name={icons.clock}
                  size={20}
                  color={theme.textSecondary}
                />
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {t("invitePage.pendingTitle", {
                    defaultValue: "Request pending",
                  })}
                </Text>
              </View>
              <Text
                style={[styles.cardText, { color: theme.textSecondary }]}
              >
                {t("invitePage.pendingDescription", {
                  name: clubName,
                  defaultValue:
                    "Your request to join {{name}} is waiting for admin approval.",
                })}
              </Text>
              <Button
                title={t("invitePage.goToClubs", {
                  defaultValue: "Go to Clubs",
                })}
                variant="outline"
                onPress={goToClubs}
                style={styles.fullButton}
              />
            </>
          )}
        </Screen>
      </>
    );
  }

  // ── Not a member → accept / decline ──────────────────────────────────
  return (
    <>
      {header}
      <Screen safeTop={false}>
        {clubCard(
          <>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {clubName}
            </Text>
            <Text style={[styles.cardText, { color: theme.textSecondary }]}>
              {t("invitePage.acceptDescription", {
                defaultValue:
                  "Accept this invitation to send a join request to the club admins.",
              })}
            </Text>
            <View style={styles.buttonRow}>
              <Button
                title={t("invitePage.decline", { defaultValue: "Decline" })}
                variant="outline"
                onPress={goHome}
                disabled={acceptMut.isPending}
                style={styles.flexButton}
              />
              <Button
                title={t("invitePage.accept", {
                  defaultValue: "Accept invitation",
                })}
                onPress={handleAccept}
                loading={acceptMut.isPending}
                style={styles.flexButton}
              />
            </View>
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  stateIcon: { marginBottom: spacing.sm },
  stateTitle: { ...typography.h3, textAlign: "center" },
  stateText: {
    ...typography.bodySm,
    textAlign: "center",
    lineHeight: 20,
  },
  stateButton: { marginTop: spacing.lg, alignSelf: "stretch" },
  card: {
    borderWidth: 1,
    borderRadius: radii.lg,
    overflow: "hidden",
    marginTop: spacing.xl,
  },
  cardImage: {
    width: "100%",
    aspectRatio: 16 / 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardImageInitial: {
    ...typography.h1,
    color: palette.white,
  },
  cardBody: { padding: spacing.lg, gap: spacing.md },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardTitle: { ...typography.h3, flexShrink: 1 },
  cardText: { ...typography.bodySm, lineHeight: 20 },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  flexButton: { flex: 1 },
  fullButton: { marginTop: spacing.sm },
});
