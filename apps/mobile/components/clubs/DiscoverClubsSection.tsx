import { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { requestJoinClub } from "@volleysmart/core";
import { useTheme } from "@/hooks/useTheme";
import { spacing, radii, typography, palette } from "@/constants/theme";
import { icons } from "@/constants/icons";
import { toast } from "@/components/ui/Toast";
import { useAuth } from "@/hooks/useAuth";
import { useDiscoverClubs } from "@/hooks/useDiscoverClubs";
import { queryKeys } from "@/constants/queryKeys";

/**
 * "Discover" section, mirroring apps/web/src/pages/Clubs.tsx:
 * horizontal strip of public clubs the user is not in, with a
 * join-request button per card (core requestJoinClub RPC).
 * Renders nothing while loading or when there is nothing to discover.
 */
export function DiscoverClubsSection() {
  const t = useTheme();
  const { t: tr } = useTranslation("clubs");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: clubs = [] } = useDiscoverClubs();

  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  if (clubs.length === 0) return null;

  const handleJoin = async (clubId: string) => {
    if (requestingId || requestedIds.has(clubId)) return;
    setRequestingId(clubId);
    try {
      const status = await requestJoinClub(clubId);
      if (status === "already_member") {
        toast(
          tr("overview.toasts.alreadyMember", {
            defaultValue: "Already a member",
          }),
          "info"
        );
      } else if (status === "already_pending") {
        toast(
          tr("overview.toasts.requestPending", {
            defaultValue: "Request already pending",
          }),
          "info"
        );
      } else {
        toast(
          tr("overview.toasts.requestSent", { defaultValue: "Request sent" })
        );
      }
      setRequestedIds((prev) => new Set(prev).add(clubId));
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.clubs.pendingJoinRequests(user?.id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.clubs.allDiscover }),
      ]);
    } catch (err) {
      console.error("Error requesting to join club:", err);
      toast(
        tr("overview.toasts.joinError", {
          defaultValue: "Failed to send join request.",
        }),
        "error"
      );
    } finally {
      setRequestingId(null);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: t.text }]}>
        {tr("discoverTitle", { defaultValue: "Discover" })}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {clubs.slice(0, 6).map((club) => {
          const pending = requestedIds.has(club.id);
          const requesting = requestingId === club.id;
          return (
            <Pressable
              key={club.id}
              onPress={() => router.push(`/clubs/${club.id}`)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: t.card, borderColor: t.cardBorder },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.thumb, { backgroundColor: t.muted }]}>
                {club.image_url ? (
                  <Image
                    source={{ uri: club.image_url }}
                    style={styles.thumbImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={styles.thumbFallback}>
                    <Text
                      style={[styles.thumbInitial, { color: t.mutedForeground }]}
                    >
                      {club.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>

              <Text
                style={[styles.name, { color: t.text }]}
                numberOfLines={2}
              >
                {club.name}
              </Text>

              {club.city && (
                <View style={styles.metaRow}>
                  <Ionicons
                    name={icons.mapPin}
                    size={12}
                    color={t.mutedForeground}
                  />
                  <Text
                    style={[styles.meta, { color: t.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {club.city}
                  </Text>
                </View>
              )}

              {club.memberCount > 0 && (
                <View style={styles.metaRow}>
                  <Ionicons
                    name={icons.users}
                    size={12}
                    color={t.mutedForeground}
                  />
                  <Text style={[styles.meta, { color: t.mutedForeground }]}>
                    {tr("memberCount", {
                      count: club.memberCount,
                      defaultValue: "{{count}} members",
                    })}
                  </Text>
                </View>
              )}

              <Pressable
                onPress={() => handleJoin(club.id)}
                disabled={requesting || pending}
                style={({ pressed }) => [
                  styles.joinButton,
                  pending
                    ? { backgroundColor: t.muted }
                    : { backgroundColor: t.primary },
                  pressed && !pending && { backgroundColor: t.primaryPressed },
                ]}
              >
                {requesting ? (
                  <ActivityIndicator size="small" color={palette.white} />
                ) : (
                  <Text
                    style={[
                      styles.joinButtonText,
                      { color: pending ? t.mutedForeground : palette.white },
                    ]}
                  >
                    {pending
                      ? tr("overview.actions.pending", {
                          defaultValue: "Pending",
                        })
                      : tr("overview.actions.join", { defaultValue: "Join" })}
                  </Text>
                )}
              </Pressable>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  title: { ...typography.h2 },
  strip: { gap: spacing.md, paddingRight: spacing.lg },
  card: {
    width: 176,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.xs,
  },
  pressed: { opacity: 0.8 },
  thumb: {
    height: 80,
    width: "100%",
    borderRadius: radii.md,
    overflow: "hidden",
    marginBottom: spacing.xs,
  },
  thumbImage: { width: "100%", height: "100%" },
  thumbFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbInitial: { ...typography.h2 },
  name: { ...typography.bodySm, fontWeight: "600" },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  meta: { ...typography.caption, flexShrink: 1 },
  joinButton: {
    marginTop: spacing.sm,
    height: 32,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  joinButtonText: { ...typography.label },
});
